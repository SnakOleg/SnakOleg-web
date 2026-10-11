import assert from "node:assert/strict";
import { test } from "node:test";
import { validateContent } from "../shared/content.ts";
import { shiftDay } from "../shared/dates.ts";
import { sign, verify } from "../shared/token.ts";
import { fingerprint, parseUA } from "../shared/ua.ts";

const secret = "unit-test-secret-0123456789abcdef0123456789";

test("signed tokens round trip and reject tampering", async () => {
  const token = await sign({ sid: "abc" }, secret, 60);
  assert.equal((await verify<{ sid: string }>(token, secret))?.sid, "abc");
  assert.equal(await verify(token + "x", secret), null);
  assert.equal(await verify(token, "another-secret-another-secret-another"), null);
  assert.equal(await verify(undefined, secret), null);
});

test("expired tokens are rejected", async () => {
  const token = await sign({ sid: "abc" }, secret, -1);
  assert.equal(await verify(token, secret), null);
});

test("content validation accepts normal data", () => {
  assert.equal(validateContent("theme", { hue: 200, mode: "dark" }), null);
  assert.equal(
    validateContent("contacts", [{ icon: "github", label: "GitHub", href: "https://github.com/x" }]),
    null,
  );
});

test("content validation rejects unsafe or malformed data", () => {
  assert.equal(validateContent("unknown", {}), "unknown section");
  assert.equal(validateContent("contacts", { not: "a list" }), "wrong shape");
  assert.equal(validateContent("theme", [1]), "wrong shape");
  assert.equal(validateContent("contacts", [{ href: "javascript:alert(1)" }]), "unsafe href");
  assert.equal(validateContent("contacts", [{ href: "//evil.example" }]), "unsafe href");
  assert.equal(validateContent("projects", [{ img: "data:text/html,x" }]), "unsafe img");
  assert.equal(validateContent("theme", JSON.parse('{"__proto__": {"x": 1}}')), "bad key");
  assert.equal(validateContent("theme", { text: "x".repeat(4001) }), "string too long");
  assert.equal(
    validateContent(
      "projects",
      Array.from({ length: 201 }, () => ({})),
    ),
    "list too long",
  );
});

test("date shifting works across month and year borders", () => {
  assert.equal(shiftDay("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDay("2024-03-01", -1), "2024-02-29");
});

test("user agents are read into browser, system and device", () => {
  const mac =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36";
  const phone =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
  const yandex =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 YaBrowser/24.9 Safari/537.36";
  assert.deepEqual(parseUA(mac), { browser: "Chrome 130", os: "macOS", device: "desktop" });
  assert.deepEqual(parseUA(phone), { browser: "Safari 18", os: "iOS 18", device: "mobile" });
  assert.equal(parseUA(yandex).browser, "Yandex 24");
  assert.equal(fingerprint(mac), "macOS|Chrome|desktop");
  assert.notEqual(fingerprint(mac), fingerprint(phone));
});

test("announcements are a valid list section", () => {
  assert.equal(
    validateContent("announce", [
      { on: true, style: "ticker", tone: "info", text: { ru: "a", en: "b" }, href: "/blog" },
    ]),
    null,
  );
  assert.equal(validateContent("announce", [{ href: "javascript:alert(1)" }]), "unsafe href");
});

import { scoreComment, isSpam } from "../shared/spam";
import { excerptOf, normalizeSettings, readMinutes } from "../shared/blog";

test("spam scoring labels ads, invites and abuse but not ordinary comments", () => {
  assert.equal(isSpam(scoreComment("Классный пост, спасибо! Особенно про стек.")), false);
  assert.equal(isSpam(scoreComment("Nice write-up, the cursor glow is great https://github.com/x")), false);
  assert.equal(isSpam(scoreComment("Заработок без вложений! Переходи по ссылке t.me/+AbCdEf")), true);
  assert.equal(isSpam(scoreComment("buy now http://a.xyz http://b.top casino bonus")), true);
  assert.equal(isSpam(scoreComment("ты х у й")), true);
  assert.equal(isSpam(scoreComment("xуй тебе")), true);
  assert.equal(isSpam(scoreComment("Спасибо за пост про хутор и худи")), false);
  assert.equal(isSpam(scoreComment("hello", { copied: true })), true);
  assert.ok(
    scoreComment("https://example.com", { newUser: true }).score > scoreComment("https://example.com").score,
  );
});

test("blog helpers: excerpts, reading time, settings bounds", () => {
  assert.equal(
    excerptOf("# Title\n\nSome **bold** text with [a link](https://x.y)."),
    "Title Some bold text with a link.",
  );
  assert.equal(readMinutes("word ".repeat(450)), 2);
  const s = normalizeSettings({ slowMode: 99999, perDay: "x", premod: true });
  assert.equal(s.slowMode, 600);
  assert.equal(s.perDay, 40);
  assert.equal(s.premod, true);
});
