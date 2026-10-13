import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { createHmac } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { after, before, test } from "node:test";
import { dayNumber, score, wordOf } from "../shared/words";

const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;
const STATE = ".wrangler/test-state";
const SECRET = "integration-secret-0123456789abcdef0123456789";
const OWNER = "4242";
const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36";
const PHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1";

let server: ChildProcess;
let log = "";

const wrangler = (args: string[]) =>
  execFileSync("npx", ["wrangler", ...args], { encoding: "utf8", stdio: "pipe" });

const sql = (query: string): Record<string, any>[] =>
  JSON.parse(
    wrangler(["d1", "execute", "snak-db", "--local", "--persist-to", STATE, "--json", "--command", query]),
  )[0].results;

const cookie = (sid: string, sub = OWNER) => {
  const body = Buffer.from(
    JSON.stringify({ sid, sub, name: "Test", exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url");
  return `__Host-snak=${body}.${createHmac("sha256", SECRET).update(body).digest("base64url")}`;
};

// A signed-in site visitor (not an admin): the user cookie plus the headers every write must carry.
const userCookie = (sub: string) => {
  const body = Buffer.from(
    JSON.stringify({ t: "u", sub, exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url");
  return `__Host-snak-u=${body}.${createHmac("sha256", SECRET).update(body).digest("base64url")}`;
};
const visitor = (sub: string) => ({
  Cookie: userCookie(sub),
  Origin: BASE,
  "X-Requested-With": "snak",
  "User-Agent": CHROME,
  "Content-Type": "application/json",
});

const admin = (sid = "sid-main") => ({
  Cookie: cookie(sid),
  Origin: BASE,
  "X-Requested-With": "snak-admin",
  "Content-Type": "application/json",
});

// A pooled connection can be closed by the server while the tests wait on the database tool; one retry is safe then.
const request = async (path: string, init: RequestInit): Promise<Response> => {
  try {
    return await fetch(BASE + path, { redirect: "manual", ...init });
  } catch (error) {
    const cause = String((error as Error & { cause?: unknown }).cause ?? error);
    if (cause.includes("other side closed")) return fetch(BASE + path, { redirect: "manual", ...init });
    throw new Error(`${init.method ?? "GET"} ${path}: ${cause}`);
  }
};

const call = async (path: string, init: RequestInit = {}) => {
  const res = await request(path, init);
  const text = await res.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {
    // not JSON
  }
  return { status: res.status, body, headers: res.headers };
};

const send = (path: string, method: string, data: unknown, headers = admin()) =>
  call(path, { method, headers, body: JSON.stringify(data) });

const track = (ua: string, data: unknown) =>
  call("/api/track", {
    method: "POST",
    headers: { Origin: BASE, "User-Agent": ua },
    body: JSON.stringify(data),
  });

before(async () => {
  if (!existsSync("dist/index.html")) execFileSync("npm", ["run", "build"], { stdio: "ignore" });
  rmSync(STATE, { recursive: true, force: true });
  wrangler(["d1", "migrations", "apply", "snak-db", "--local", "--persist-to", STATE]);
  const now = Date.now();
  const row = (id: string, ip: string, country: string, ua: string) =>
    `('${id}','${OWNER}','Test',${now},${now},'${ip}','${ip}','${country}','${country}','City','Org','${ua}','fp',0)`;
  sql(
    "INSERT INTO sessions(id,tg_id,name,created,seen,ip,last_ip,country,last_country,city,org,ua,fp,revoked) VALUES " +
      [
        row("sid-main", "10.0.0.1", "NL", CHROME),
        row("sid-other", "10.0.0.2", "DE", PHONE),
        row("sid-third", "10.0.0.3", "FR", PHONE),
      ].join(","),
  );

  const person = (id: string, name: string, username: string) =>
    `('${id}','${name}','${username}','',${now - 7 * 864e5},${now},0,0)`;
  sql(
    "INSERT INTO users(id,name,username,picture,created,seen,comments,trusted) VALUES " +
      [
        person(OWNER, "Owner", "owner"),
        person("7001", "Alice", "alice"),
        person("7002", "Spammer", "spam"),
        person("7003", "Bob", "bob"),
        person("7004", "Carol", "carol"),
      ].join(","),
  );

  server = spawn(
    "npx",
    [
      "wrangler",
      "pages",
      "dev",
      "dist",
      "--port",
      String(PORT),
      "--ip",
      "127.0.0.1",
      "--persist-to",
      STATE,
      "--binding",
      `SESSION_SECRET=${SECRET}`,
      "--binding",
      `ADMIN_TG_ID=${OWNER}`,
      "--binding",
      "TG_CLIENT_ID=123456",
      "--binding",
      "TG_CLIENT_SECRET=secret",
      "--binding",
      "BOT_SECRET=bot-secret-0123456789",
      "--binding",
      "TG_BOT_TOKEN=0:test",
    ],
    { stdio: ["ignore", "pipe", "pipe"], detached: true },
  );
  server.stdout?.on("data", (d) => (log += d));
  server.stderr?.on("data", (d) => (log += d));
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch(`${BASE}/api/content`)).ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("dev server did not start");
});

after(() => {
  if (process.env.TEST_LOG) console.log(log.slice(-3000));
  // the server was started in its own process group, so one signal stops wrangler and its worker
  if (server?.pid) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      // already stopped
    }
  }
});

test("the dashboard API refuses strangers", async () => {
  assert.equal((await call("/api/admin/stats")).status, 401);
  assert.equal((await call("/api/admin/stats", { headers: { Cookie: "__Host-snak=abc.def" } })).status, 401);
  assert.equal((await call("/api/auth/me", { headers: { Cookie: cookie("sid-main", "999") } })).status, 401);
  assert.equal((await call("/api/auth/me", { headers: { Cookie: cookie("no-such-session") } })).status, 401);
  assert.equal((await call("/api/auth/me", { headers: admin() })).body.name, "Test");
});

test("live presence only accepts websocket upgrades", async () => {
  assert.equal((await call("/api/live")).status, 426);
});

test("passport stamps: only found eggs and the current season are accepted from the browser", async () => {
  const save = (as: string, codes: unknown) =>
    call("/api/stamps", { method: "POST", headers: visitor(as), body: JSON.stringify({ codes }) });
  assert.equal((await call("/api/stamps", { method: "POST", body: "{}" })).status, 403);
  assert.equal(
    (await call("/api/stamps", { method: "POST", headers: { ...visitor("7001"), Cookie: "" }, body: "{}" }))
      .status,
    401,
  );
  assert.deepEqual((await call("/api/stamps")).body.stamps, []);
  const r = await save("7001", [
    "terminal",
    "sudo",
    "guest",
    "word7",
    "c:RU",
    "s:newyear:2001",
    5,
    "terminal",
  ]);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.added.sort(), ["sudo", "terminal"]);
  const mine = (await call("/api/stamps", { headers: visitor("7001") })).body.stamps.map(
    (x: { code: string }) => x.code,
  );
  assert.ok(mine.includes("terminal") && mine.includes("sudo") && !mine.includes("guest"));
  assert.deepEqual(
    (await call("/api/stamps", { headers: visitor("7004") })).body.stamps.filter(
      (x: { code: string }) => !x.code.startsWith("c:"),
    ),
    [],
  );
});

test("games: the word is checked on the server and the reaction test needs a real round", async () => {
  const day = dayNumber();
  const answer = wordOf(day);
  assert.equal(score(answer, answer), "ggggg");
  assert.equal(score("аабба", "баааа"), "ygybg");
  const state = (await call("/api/game?kind=word")).body;
  assert.equal(state.day, day);
  assert.equal(state.streak, 0);
  assert.equal((await call("/api/game?kind=word&g=abc")).status, 400);
  const miss = await call("/api/game?kind=word&g=ааааа&n=1");
  assert.equal(miss.status, 200);
  assert.equal(miss.body.answer, undefined);
  const hit = await call(`/api/game?kind=word&g=${encodeURIComponent(answer)}&n=2`);
  assert.equal(hit.body.p, "ggggg");
  assert.equal(hit.body.answer, answer);

  const play = (as: string, data: object) =>
    call("/api/game", { method: "POST", headers: visitor(as), body: JSON.stringify(data) });
  assert.equal((await call("/api/game", { method: "POST", body: "{}" })).status, 403);
  assert.equal((await play("7001", { kind: "word", day: day - 1, tries: 3, won: true })).status, 400);
  const won = await play("7001", { kind: "word", day, tries: 3, won: true });
  assert.equal(won.body.streak, 1);
  assert.deepEqual(won.body.added, ["word"]);
  const owned = (await call("/api/stamps", { headers: visitor("7001") })).body.stamps.map(
    (x: { code: string }) => x.code,
  );
  assert.ok(owned.includes("word") && !owned.includes("word7"));

  const board = (await call("/api/game?kind=quick", { headers: visitor("7001") })).body;
  assert.equal(typeof board.t, "number");
  assert.equal((await play("7001", { kind: "quick", ms: 40, t: Date.now() - 5000 })).status, 400);
  assert.equal((await play("7001", { kind: "quick", ms: 200, t: Date.now() })).status, 400);
  const fast = await play("7001", { kind: "quick", ms: 200, t: Date.now() - 3000 });
  assert.deepEqual(fast.body.added, ["quick"]);
  const slow = await play("7001", { kind: "quick", ms: 400, t: Date.now() - 3000 });
  assert.equal(slow.body.best, 200);
  const after = (await call("/api/game?kind=quick")).body;
  assert.equal(after.top[0].ms, 200);
});

test("bot status: only the owner can set it, presets and free text both work", async () => {
  assert.equal((await call("/api/now")).body.now, null);
  const hook = (secret: string | null, update: object) =>
    call("/api/bot", {
      method: "POST",
      headers: secret ? { "X-Telegram-Bot-Api-Secret-Token": secret } : {},
      body: JSON.stringify(update),
    });
  const press = (from: number, data: string) => ({
    callback_query: { id: "1", data, from: { id: from }, message: { chat: { id: from }, message_id: 1 } },
  });
  assert.equal((await hook(null, press(Number(OWNER), "now:code"))).status, 403);
  assert.equal((await hook("wrong", press(Number(OWNER), "now:code"))).status, 403);
  await hook("bot-secret-0123456789", press(1, "now:code"));
  assert.equal((await call("/api/now")).body.now, null);
  await hook("bot-secret-0123456789", press(Number(OWNER), "now:code"));
  assert.equal((await call("/api/now")).body.now.ru, "Пишу код");
  await hook("bot-secret-0123456789", {
    message: { text: "/now гуляю с котом", chat: { id: 1 }, from: { id: Number(OWNER) } },
  });
  assert.equal((await call("/api/now")).body.now.ru, "гуляю с котом");
  await hook("bot-secret-0123456789", press(Number(OWNER), "now:clear"));
  assert.equal((await call("/api/now")).body.now, null);
});

test("garden and time capsules: one plant a day, sealed text stays on the server", async () => {
  const send = (path: string, as: string, data: object) =>
    call(path, { method: "POST", headers: visitor(as), body: JSON.stringify(data) });
  assert.equal((await call("/api/garden", { method: "POST", body: "{}" })).status, 403);
  assert.equal((await send("/api/garden", "7001", { action: "plant", kind: "weed" })).status, 400);
  assert.equal((await send("/api/garden", "7001", { action: "water" })).status, 400);
  const planted = await send("/api/garden", "7001", { action: "plant", kind: "tulip" });
  assert.equal(planted.status, 201);
  assert.equal((await send("/api/garden", "7001", { action: "plant", kind: "cactus" })).status, 400);
  const water = await send("/api/garden", "7001", { action: "water" });
  assert.equal(water.body.mine.stage, 1);
  assert.equal(water.body.mine.can, false);
  assert.equal((await send("/api/garden", "7001", { action: "water" })).status, 409);
  const garden = (await call("/api/garden", { headers: visitor("7001") })).body;
  assert.equal(garden.plants.length, 1);
  assert.equal(garden.plants[0].own, true);
  assert.equal((await call("/api/garden")).body.plants[0].own, false);

  const peer = (await call("/api/garden", { headers: visitor("7001") })).body.plants[0];
  assert.equal(
    (await send("/api/garden", "7001", { action: "gift", target: peer.id })).status,
    400,
    "no gifts to yourself",
  );
  assert.equal((await send("/api/garden", "7004", { action: "plant", kind: "cactus" })).status, 201);
  assert.equal((await send("/api/garden", "7004", { action: "gift", target: "7001" })).status, 200);
  assert.equal((await send("/api/garden", "7004", { action: "gift", target: "no-such" })).status, 404);
  assert.equal((await call("/api/garden")).body.plants.find((p: { id: string }) => p.id === "7001").gifts, 1);

  const day = 86_400_000;
  const seal = (as: string, data: object) => send("/api/capsule", as, data);
  assert.equal((await seal("7001", { body: "Привет себе", opens: Date.now() + 60_000 })).status, 400);
  assert.equal((await seal("7001", { body: "", opens: Date.now() + 2 * day })).status, 400);
  assert.equal((await seal("7001", { body: "x".repeat(501), opens: Date.now() + 2 * day })).status, 413);
  const made = await seal("7001", { body: "Привет себе из прошлого", opens: Date.now() + 2 * day });
  assert.equal(made.status, 201);
  const mine = (await call("/api/capsule", { headers: visitor("7001") })).body;
  assert.equal(mine.mine[0].body, undefined);
  assert.equal(mine.vault.length, 1);
  assert.equal(mine.total, 1);
  assert.ok(!JSON.stringify((await call("/api/capsule")).body).includes("Привет себе"));
  assert.equal((await seal("7001", { open: made.body.capsule.id })).status, 403);
  assert.equal((await seal("7004", { open: made.body.capsule.id })).status, 404);
  sql(`UPDATE capsules SET opens=${Date.now() - 1000} WHERE id=${made.body.capsule.id}`);
  const opened = await seal("7001", { open: made.body.capsule.id });
  assert.equal(opened.body.capsule.body, "Привет себе из прошлого");
  assert.ok(opened.body.capsule.opened);
  for (let i = 0; i < 3; i++) await seal("7004", { body: `Письмо ${i}`, opens: Date.now() + 3 * day });
  assert.equal((await seal("7004", { body: "Четвёртое", opens: Date.now() + 3 * day })).status, 409);
  const stamps = (await call("/api/stamps", { headers: visitor("7001") })).body.stamps.map(
    (x: { code: string }) => x.code,
  );
  assert.ok(stamps.includes("gardener") && stamps.includes("capsule"));
});

test("game pages share one shell and unknown games are 404", async () => {
  for (const path of ["/games", "/games/word", "/games/reaction", "/games/garden", "/games/capsule"]) {
    const res = await request(path, {});
    assert.equal(res.status, 200, path);
    assert.match(await res.text(), /id="games"/);
  }
  assert.equal((await request("/games/snake", {})).status, 404);
  assert.equal((await request("/games/word/extra", {})).status, 404);
});

test("weather answers with the current conditions or says it is unavailable", async () => {
  const r = await call("/api/weather");
  assert.ok([200, 503].includes(r.status));
  if (r.status === 200) assert.equal(typeof r.body.code, "number");
});

test("writes need the same origin and the custom header", async () => {
  const body = JSON.stringify({ key: "theme", value: { hue: 1, mode: "dark" }, base: 0 });
  const noHeader = await call("/api/admin/content", {
    method: "PUT",
    headers: { Cookie: cookie("sid-main"), "Content-Type": "application/json" },
    body,
  });
  const foreign = await call("/api/admin/content", {
    method: "PUT",
    headers: { ...admin(), Origin: "https://evil.example" },
    body,
  });
  assert.equal(noHeader.status, 403);
  assert.equal(foreign.status, 403);
});

test("content is validated, versioned and can be restored or reset", async () => {
  assert.equal(
    (
      await send("/api/admin/content", "PUT", {
        key: "contacts",
        value: [{ href: "javascript:alert(1)" }],
        base: 0,
      })
    ).status,
    400,
  );
  assert.equal(
    (await send("/api/admin/content", "PUT", { key: "theme", value: { hue: 100 }, base: 0 })).body.version,
    1,
  );
  assert.equal(
    (await send("/api/admin/content", "PUT", { key: "theme", value: { hue: 200 }, base: 1 })).body.version,
    2,
  );
  assert.equal(
    (await send("/api/admin/content", "PUT", { key: "theme", value: { hue: 300 }, base: 1 })).status,
    409,
  );

  const restored = await send("/api/admin/content", "POST", { key: "theme", version: 1 });
  assert.equal(restored.body.version, 3);
  const state = await call("/api/admin/content?key=theme", { headers: admin() });
  assert.deepEqual(state.body.value, { hue: 100 });
  assert.equal(state.body.saved, true);
  assert.equal(state.body.history[0].note, "restore:1");
  assert.deepEqual((await call("/api/admin/content?key=theme&version=2", { headers: admin() })).body.value, {
    hue: 200,
  });
  assert.deepEqual((await call("/api/content")).body, { theme: { hue: 100 } });

  const reset = await send("/api/admin/content", "DELETE", { key: "theme" });
  assert.equal(reset.body.version, 4);
  assert.equal((await send("/api/admin/content", "POST", { key: "theme", version: 4 })).status, 400);
  assert.deepEqual((await call("/api/content")).body, {});
});

test("sessions can be ended and addresses blocked, but not your own", async () => {
  const mine = (await call("/api/admin/audit", { headers: admin() })).body.rows[0].ip as string;
  assert.equal((await send("/api/admin/sessions", "POST", { action: "block", ip: mine })).status, 400);
  assert.equal(
    (await send("/api/admin/sessions", "POST", { action: "block", ip: "203.0.113.9", reason: "test" }))
      .status,
    200,
  );
  assert.equal(
    (await send("/api/admin/sessions", "POST", { action: "revoke", id: "sid-third" })).status,
    200,
  );
  assert.equal((await call("/api/auth/me", { headers: admin("sid-third") })).status, 401);

  const others = await send("/api/admin/sessions", "POST", { action: "revoke_others" });
  assert.equal(others.body.count, 1);
  assert.equal((await send("/api/admin/sessions", "POST", { action: "revoke_others" })).body.count, 0);

  const list = (await call("/api/admin/sessions", { headers: admin() })).body;
  assert.equal(list.me, "sid-main");
  assert.deepEqual(
    list.blocked.map((b: { ip: string }) => b.ip),
    ["203.0.113.9"],
  );
});

test("sign in starts with Telegram, reports its errors and shuts out blocked addresses", async () => {
  const start = await call("/api/auth/login");
  assert.equal(start.status, 302);
  const target = new URL(start.headers.get("location") ?? "");
  assert.equal(target.origin, "https://oauth.telegram.org");
  assert.equal(target.searchParams.get("code_challenge_method"), "S256");
  assert.equal(target.searchParams.get("redirect_uri"), `${BASE}/api/auth/callback`);

  assert.equal((await call("/api/auth/callback?error=access_denied")).status, 400);
  assert.equal((await call("/api/auth/callback?code=x&state=y")).status, 400);

  const mine = (await call("/api/admin/audit", { headers: admin() })).body.rows[0].ip as string;
  sql(`INSERT OR REPLACE INTO blocked(ip,ts,reason) VALUES ('${mine}',1,'test')`);
  const blocked = await call("/api/auth/login");
  assert.equal(blocked.status, 403);
  assert.match(blocked.body, /Доступ закрыт/);
  sql(`DELETE FROM blocked WHERE ip='${mine}'`);
});

test("the counter limits one visitor and counts each link once a day", async () => {
  for (let i = 0; i < 25; i++) await track(CHROME, { t: "pv", p: "/", l: "ru" });
  for (let i = 0; i < 5; i++) await track(CHROME, { t: "click", n: "github.com/SnakOleg" });
  await track(CHROME, { t: "click", n: "t.me/the_nikeri" });
  await track(CHROME, { t: "click", n: "<script>alert(1)</script>" });
  await track("Googlebot/2.1", { t: "click", n: "bot.example.com" });
  await track(PHONE, { t: "click", n: "github.com/SnakOleg" });
  for (let i = 0; i < 45; i++) await track(PHONE, { t: "click", n: `site${i}.example.com` });

  const total = (metric: string) => sql(`SELECT COALESCE(SUM(n),0) n FROM agg WHERE metric='${metric}'`)[0].n;
  assert.equal(total("views"), 20);
  assert.equal(total("visitors"), 1);
  const clicks = Object.fromEntries(
    sql("SELECT key,n FROM agg WHERE metric='click'").map((r) => [r.key, r.n]),
  );
  assert.equal(clicks["github.com/snakoleg"], 2);
  assert.equal(clicks["t.me/the_nikeri"], 1);
  assert.equal(
    Object.keys(clicks).some((k) => k.includes("script") || k.includes("bot.example")),
    false,
  );
  assert.equal(
    sql(
      "SELECT COUNT(*) n FROM clicked WHERE vid IN (SELECT vid FROM clicked GROUP BY vid HAVING COUNT(*) > 20)",
    )[0].n,
    40,
  );

  const stats = (await call("/api/admin/stats?days=1", { headers: admin() })).body;
  assert.equal(stats.series[0].views, 20);
});

const palette = (acc: string) => ({ bg: "#17181b", surf: "#212227", ink: "#ececf0", acc, acc2: "#c792ea" });
const suggestion = (body: unknown, as = OWNER) =>
  call("/api/presets", { method: "POST", headers: visitor(as), body: JSON.stringify(body) });

test("visitor themes are validated, limited, moderated and shown with their author", async () => {
  assert.deepEqual((await call("/api/presets")).body, { presets: [] });

  const first = await suggestion({
    name: "<b>Ночь</b>",
    author: "Mira",
    comment: "Тёмная <script>",
    palette: palette("#8ab4ff"),
  });
  assert.equal(first.status, 201);
  assert.equal((await suggestion({ name: "Копия", palette: palette("#8AB4FF") })).status, 409);
  assert.equal(
    (await suggestion({ name: "Плохая", palette: { ...palette("#8ab4ff"), ink: "#2a2a2e" } })).status,
    400,
  );
  assert.equal((await suggestion({ name: "x", palette: palette("#ff8a5c") })).status, 400);
  assert.equal((await suggestion({ name: "Закат", palette: palette("#ff8a5c") })).status, 201);
  assert.equal((await suggestion({ name: "Лишняя", palette: palette("#6ee7a0") })).status, 429);

  const list = (await call("/api/admin/presets", { headers: admin() })).body;
  assert.equal(list.presets.length, 2);
  const night = list.presets.find((p: { name: string }) => p.name.includes("Ночь"));
  assert.equal(night.status, "pending");
  assert.equal(night.name.includes("<"), false);
  assert.equal(night.comment.includes("<"), false);
  assert.deepEqual((await call("/api/presets")).body, { presets: [] });
  assert.equal((await call("/api/admin/presets", { method: "POST", body: "{}" })).status, 401);

  const approved = await send("/api/admin/presets", "POST", {
    action: "approve",
    id: night.id,
    name: "Ночь",
    author: "Mira K.",
    comment: "Для вечера",
  });
  assert.equal(approved.status, 200);
  const shown = (await call("/api/presets")).body.presets;
  assert.equal(shown.length, 1);
  assert.equal(shown[0].author, "Mira K.");
  assert.equal(shown[0].palette.acc, "#8ab4ff");

  const other = list.presets.find((p: { id: number }) => p.id !== night.id);
  assert.equal((await send("/api/admin/presets", "POST", { action: "reject", id: other.id })).status, 200);
  assert.equal((await send("/api/admin/presets", "POST", { action: "delete", id: other.id })).status, 200);
  assert.equal((await send("/api/admin/presets", "POST", { action: "delete", id: other.id })).status, 404);
  assert.equal((await call("/api/presets")).body.presets.length, 1);
});

test("suggestions can be switched off from the dashboard", async () => {
  const version = (await call("/api/admin/content?key=theme", { headers: admin() })).body.version;
  assert.equal(
    (
      await send("/api/admin/content", "PUT", {
        key: "theme",
        value: { hue: 255, mode: "auto", presets: false },
        base: version,
      })
    ).status,
    200,
  );
  assert.equal((await suggestion({ name: "Закрыто", palette: palette("#00f0ff") })).body.error, "closed");
  assert.equal((await call("/api/admin/presets", { headers: admin() })).body.accepting, false);
  assert.equal((await send("/api/admin/content", "DELETE", { key: "theme" })).status, 200);
});

test("the public counter only reports totals", async () => {
  const reply = await call("/api/counter");
  assert.equal(reply.status, 200);
  assert.deepEqual(Object.keys(reply.body).sort(), ["views", "visitors"]);
  assert.equal(reply.body.views, 20);
  assert.match(reply.headers.get("cache-control") ?? "", /max-age/);
});

test("the link checker is owner only and refuses internal addresses", async () => {
  assert.equal((await call("/api/admin/links", { method: "POST", body: "{}" })).status, 401);
  const reply = await send("/api/admin/links", "POST", {
    urls: ["http://127.0.0.1:1/x", "mailto:a@b.c", "not a url"],
  });
  assert.equal(reply.status, 200);
  const notes = reply.body.results.map((r: { note?: string }) => r.note);
  assert.deepEqual(notes, ["внутренний адрес", "некорректный адрес"]);
});

test("status reports what is configured", async () => {
  const status = (await call("/api/admin/status", { headers: admin() })).body;
  assert.deepEqual(status.env, { telegram: true, secret: true, admin: true, notifications: true });
});

test("theme suggestions need a sign-in and honour per-user limits and bans", async () => {
  const anon = await call("/api/presets", {
    method: "POST",
    headers: { Origin: BASE, "User-Agent": CHROME, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Аноним", palette: palette("#123abc") }),
  });
  assert.equal(anon.status, 403);
  const noHeader = await call("/api/presets", {
    method: "POST",
    headers: { ...visitor("7001"), "X-Requested-With": "" },
    body: JSON.stringify({ name: "Тест", palette: palette("#123abc") }),
  });
  assert.equal(noHeader.status, 403);

  const hues = ["#1a8ab4", "#b41a8a", "#8ab41a", "#4ab4ff"];
  const codes = [];
  for (const [i, acc] of hues.entries())
    codes.push((await suggestion({ name: `Тема ${i}`, palette: palette(acc) }, "7001")).status);
  assert.deepEqual(codes.slice(0, 3).filter((c) => c === 201 || c === 429).length, 3);

  const ban = await send("/api/admin/community", "POST", {
    action: "ban",
    user: "7002",
    scope: "themes",
    days: 7,
    reason: "Спам темами",
  });
  assert.equal(ban.status, 200);
  const refused = await suggestion({ name: "Мусор", palette: palette("#abcdef") }, "7002");
  assert.equal(refused.status, 403);
  assert.equal(refused.body.error, "banned");
  assert.equal(refused.body.ban.reason, "Спам темами");
  const me = (await call("/api/user/me", { headers: visitor("7002") })).body;
  assert.equal(me.bans.themes.reason, "Спам темами");
  assert.equal(me.bans.blog, null);
  const queue = (await call("/api/admin/presets", { headers: admin() })).body.presets;
  assert.ok(queue.every((p: { banned: number }) => typeof p.banned === "number"));
  assert.equal((await send("/api/admin/community", "POST", { action: "unban", user: "7002" })).status, 200);
});

test("blog: posts are admin-only to write, drafts and scheduled posts stay private", async () => {
  const body = {
    title: "Первый <b>пост</b>",
    body: "# Привет\n\nТекст **поста**",
    tags: ["Код", "bad tag!", "код"],
    status: "published",
  };
  assert.equal((await call("/api/admin/blog", { method: "POST", body: JSON.stringify(body) })).status, 401);
  assert.equal(
    (await call("/api/admin/blog", { method: "POST", headers: visitor("7001"), body: JSON.stringify(body) }))
      .status,
    401,
  );

  const made = await send("/api/admin/blog", "POST", body);
  assert.equal(made.status, 201);
  const draft = await send("/api/admin/blog", "POST", { title: "Черновик", body: "x", status: "draft" });
  const later = await send("/api/admin/blog", "POST", {
    title: "Позже",
    body: "x",
    status: "published",
    publishAt: Date.now() + 864e5,
  });
  assert.equal((await send("/api/admin/blog", "POST", { title: "", body: "x" })).status, 400);
  assert.equal(
    (await send("/api/admin/blog", "POST", { title: "t", cover: "javascript:alert(1)" })).status,
    400,
  );

  const list = (await call("/api/blog/posts")).body;
  assert.deepEqual(
    list.posts.map((p: { id: number }) => p.id),
    [made.body.id],
  );
  assert.deepEqual(list.posts[0].tags, ["код"]);
  assert.equal(list.posts[0].excerpt, "Привет\nТекст поста");
  assert.equal((await call(`/api/blog/posts/${draft.body.id}`)).status, 404);
  assert.equal((await call(`/api/blog/posts/${later.body.id}`)).status, 404);
  assert.equal((await call(`/api/blog/posts/${made.body.id}`)).body.post.title, "Первый <b>пост</b>");

  assert.equal((await call("/api/blog/posts?tag=код")).body.posts.length, 1);
  assert.equal((await call("/api/blog/posts?tag=нет")).body.posts.length, 0);
  assert.equal((await call("/api/blog/posts?q=поста")).body.posts.length, 1);

  const page = await call(`/blog/${made.body.id}`);
  assert.equal(page.status, 200);
  assert.ok(String(page.body).includes('property="og:title" content="Первый <b>пост</b> - Snak / Oleg"'));
  assert.equal((await call("/blog/9999")).status, 404);
  const rss = await call("/blog/rss.xml");
  assert.ok(String(rss.body).includes("<item>") && !String(rss.body).includes("Черновик"));

  const view = () =>
    call("/api/blog/view", {
      method: "POST",
      headers: { Origin: BASE, "User-Agent": CHROME },
      body: JSON.stringify({ post: made.body.id }),
    });
  await view();
  await view();
  assert.equal((await call(`/api/blog/posts/${made.body.id}`)).body.post.views, 1);
});

test("blog: comments are protected, spam is labelled, bans and settings work", async () => {
  const post = (await call("/api/blog/posts")).body.posts[0].id;
  const comment = (as: string, text: string, extra: object = {}) =>
    call("/api/blog/comments", {
      method: "POST",
      headers: visitor(as),
      body: JSON.stringify({ post, body: text, ...extra }),
    });

  assert.equal(
    (
      await call("/api/blog/comments", {
        method: "POST",
        headers: { Origin: BASE, "Content-Type": "application/json" },
        body: JSON.stringify({ post, body: "hi" }),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call("/api/blog/comments", {
        method: "POST",
        headers: { ...visitor("7001"), Cookie: "" },
        body: JSON.stringify({ post, body: "hi" }),
      })
    ).status,
    401,
  );

  const settings = (await call("/api/admin/community", { headers: admin() })).body.settings;
  assert.equal(settings.slowMode, 10);
  await send("/api/admin/community", "POST", { action: "settings", value: { ...settings, slowMode: 0 } });

  const ok = await comment("7001", "Классный пост!");
  assert.equal(ok.status, 201);
  assert.equal(ok.body.comment.flagged, false);
  assert.equal((await comment("7001", "Классный пост!")).status, 409);
  assert.equal((await comment("7001", "x".repeat(1001))).status, 413);
  assert.equal((await comment("7001", "   ")).status, 400);

  const spam = await comment("7002", "Заработок без вложений! t.me/+AbCdEf казино бонус");
  assert.equal(spam.status, 201);
  assert.equal(spam.body.comment.flagged, true);
  assert.equal(spam.body.comment.body, "");
  const listing = (await call(`/api/blog/comments?post=${post}`)).body.comments;
  const shown = listing.find((c: { id: number }) => c.id === spam.body.comment.id);
  assert.equal(shown.flagged, true);
  assert.equal(JSON.stringify(listing).includes("казино"), false);
  const reveal = await call(`/api/blog/comments/${spam.body.comment.id}/reveal`);
  assert.ok(reveal.body.body.includes("казино"));
  assert.equal((await call(`/api/blog/comments/${ok.body.comment.id}/reveal`)).status, 404);

  const reply = await comment("7003", "Согласен", { parent: ok.body.comment.id });
  assert.equal(reply.body.comment.parent, ok.body.comment.id);
  const nested = await comment("7001", "Спасибо", { parent: reply.body.comment.id });
  assert.equal(nested.body.comment.parent, ok.body.comment.id);
  assert.equal((await comment("7003", "Классный пост!")).body.comment.flagged, true);

  const patch = (as: string, id: number, text: string) =>
    call(`/api/blog/comments/${id}`, {
      method: "PATCH",
      headers: visitor(as),
      body: JSON.stringify({ body: text }),
    });
  assert.equal((await patch("7003", ok.body.comment.id, "чужое")).status, 404);
  assert.equal((await patch("7001", ok.body.comment.id, "Классный пост, поправил")).status, 200);
  assert.equal(
    (await patch("7001", ok.body.comment.id, "казино бонус t.me/+x заработок")).body.status,
    "flagged",
  );
  sql(`UPDATE comments SET created=${Date.now() - 30 * 60_000} WHERE id=${reply.body.comment.id}`);
  assert.equal((await patch("7003", reply.body.comment.id, "поздно")).status, 403);

  const react = (as: string, emoji: string, kind = "post", target = post) =>
    call("/api/blog/react", {
      method: "POST",
      headers: visitor(as),
      body: JSON.stringify({ kind, target, emoji }),
    });
  assert.deepEqual((await react("7001", "🔥")).body.reactions, { "🔥": 1 });
  assert.deepEqual((await react("7001", "🔥")).body.reactions, {});
  await react("7001", "🔥");
  await react("7001", "❤️");
  await react("7001", "🎉");
  assert.equal((await react("7001", "😂")).status, 409);
  assert.equal((await react("7001", "💩")).status, 400);
  assert.equal((await react("7001", "🔥", "post", 99999)).status, 404);
  assert.deepEqual(
    (
      await call(`/api/blog/posts/${post}`, { headers: { Cookie: userCookie("7001") } })
    ).body.post.mine.sort(),
    ["❤️", "🎉", "🔥"].sort(),
  );

  const target = reply.body.comment.id;
  const report = (as: string) =>
    call("/api/blog/report", {
      method: "POST",
      headers: visitor(as),
      body: JSON.stringify({ comment: target }),
    });
  assert.equal((await report("7003")).status, 400);
  await report("7001");
  await report("7002");
  assert.equal(
    (await call(`/api/blog/comments?post=${post}`)).body.comments.find((c: { id: number }) => c.id === target)
      .flagged,
    false,
  );
  await report(OWNER);
  assert.equal(
    (await call(`/api/blog/comments?post=${post}`)).body.comments.find((c: { id: number }) => c.id === target)
      .flagged,
    true,
  );

  const queue = (await call("/api/admin/community?tab=comments&status=flagged", { headers: admin() })).body
    .comments;
  assert.ok(queue.length >= 2 && queue[0].flags);
  assert.equal(
    (await send("/api/admin/community", "POST", { action: "ban", user: OWNER, scope: "all" })).status,
    400,
  );
  assert.equal(
    (
      await send("/api/admin/community", "POST", {
        action: "ban",
        user: "7002",
        scope: "blog",
        days: 1,
        reason: "Рассылает рекламу",
        purge: true,
      })
    ).status,
    200,
  );
  const blocked = await comment("7002", "Ещё одно");
  assert.equal(blocked.status, 403);
  assert.deepEqual([blocked.body.error, blocked.body.ban.reason], ["banned", "Рассылает рекламу"]);
  assert.equal((await react("7002", "👍")).status, 403);
  assert.equal(
    JSON.stringify((await call(`/api/blog/comments?post=${post}`)).body).includes("казино"),
    false,
  );
  const bans = (await call("/api/admin/community?tab=bans", { headers: admin() })).body.bans;
  assert.equal(bans[0].reason, "Рассылает рекламу");
  assert.equal((await send("/api/admin/community", "POST", { action: "unban", user: "7002" })).status, 200);
  assert.equal((await comment("7002", "Я исправился")).status, 201);

  await send("/api/admin/community", "POST", { action: "settings", value: { ...settings, slowMode: 30 } });
  assert.equal((await comment("7003", "первый")).status, 201);
  assert.equal((await comment("7003", "второй")).body.error, "slow");
  await send("/api/admin/community", "POST", {
    action: "settings",
    value: { ...settings, slowMode: 0, premod: true },
  });
  const held = await comment("7004", "Новый комментарий на проверку");
  assert.equal(held.body.comment.pending, true);
  assert.equal(
    (await call(`/api/blog/comments?post=${post}`)).body.comments.some(
      (c: { id: number }) => c.id === held.body.comment.id,
    ),
    false,
  );
  assert.equal(
    (
      await send("/api/admin/community", "POST", {
        action: "comment",
        id: held.body.comment.id,
        to: "visible",
      })
    ).status,
    200,
  );
  await send("/api/admin/community", "POST", {
    action: "settings",
    value: { ...settings, slowMode: 0, commentsOpen: false },
  });
  assert.equal((await comment("7001", "Закрыто?")).body.error, "closed");
  await send("/api/admin/community", "POST", { action: "settings", value: settings });

  assert.equal((await call("/api/user/me", { method: "DELETE", headers: visitor("7003") })).status, 200);
  assert.equal((await call("/api/user/me", { headers: visitor("7003") })).body.user, null);
});

test("blog: the owner posts and moderates from the page, replies remember who they answer", async () => {
  const post = (as: string, data: object) =>
    call("/api/blog/compose", { method: "POST", headers: visitor(as), body: JSON.stringify(data) });
  const settings = (await call("/api/admin/community", { headers: admin() })).body.settings;
  await send("/api/admin/community", "POST", { action: "settings", value: { ...settings, slowMode: 0 } });

  assert.equal((await post("7001", { title: "x", status: "published" })).status, 403);
  const made = await post(OWNER, { title: "Из блога", body: "Привет", status: "published", tags: ["тест"] });
  assert.equal(made.status, 201);
  let refused = 0;
  for (let i = 0; i < 5; i++)
    if ((await post(OWNER, { title: `Закреп ${i}`, status: "published", pinned: true })).status === 409)
      refused++;
  assert.ok(refused >= 2);
  const pinned = (await call("/api/blog/posts")).body.posts.filter((p: { pinned: boolean }) => p.pinned);
  assert.ok(pinned.length <= 3);
  assert.equal(
    (await call(`/api/blog/compose?id=${made.body.id}`, { headers: visitor(OWNER) })).body.post.body,
    "Привет",
  );
  assert.equal(
    (await call(`/api/blog/compose?id=${made.body.id}`, { headers: visitor("7001") })).status,
    403,
  );

  const comment = (as: string, text: string, parent?: number) =>
    call("/api/blog/comments", {
      method: "POST",
      headers: visitor(as),
      body: JSON.stringify({ post: made.body.id, body: text, parent }),
    });
  const first = (await comment("7001", "Первый комментарий")).body.comment;
  const second = (await comment("7004", "Ответ первому", first.id)).body.comment;
  const third = (await comment("7001", "Ответ на ответ", second.id)).body.comment;
  assert.equal(third.parent, first.id);
  assert.equal(third.to, second.id);

  await call("/api/blog/react", {
    method: "POST",
    headers: visitor(OWNER),
    body: JSON.stringify({ kind: "comment", target: first.id, emoji: "❤️" }),
  });
  const listing = (await call(`/api/blog/comments?post=${made.body.id}`)).body.comments;
  assert.deepEqual(listing.find((c: { id: number }) => c.id === first.id).byOwner, ["❤️"]);
  assert.deepEqual(listing.find((c: { id: number }) => c.id === second.id).byOwner, []);

  const mod = (as: string, data: object) =>
    call("/api/blog/mod", { method: "POST", headers: visitor(as), body: JSON.stringify(data) });
  assert.equal((await mod("7001", { action: "comment", comment: second.id, to: "hidden" })).status, 403);
  assert.equal((await mod(OWNER, { action: "comment", comment: second.id, to: "hidden" })).status, 200);
  const after = (await call(`/api/blog/comments?post=${made.body.id}`)).body.comments;
  assert.ok(!after.some((c: { id: number }) => c.id === second.id || c.id === third.id));

  assert.equal((await mod("7001", { action: "pin", comment: first.id, pin: true })).status, 403);
  assert.equal((await mod(OWNER, { action: "pin", comment: second.id, pin: true })).status, 404);
  assert.equal((await mod(OWNER, { action: "pin", comment: first.id, pin: true })).status, 200);
  const pinnedList = (await call(`/api/blog/comments?post=${made.body.id}`)).body.comments;
  assert.equal(pinnedList.find((c: { id: number }) => c.id === first.id).pinned, true);

  const guest = (as: string, text: string) =>
    call("/api/blog/comments", {
      method: "POST",
      headers: visitor(as),
      body: JSON.stringify({ post: 0, body: text }),
    });
  const hello = (await guest("7001", "Привет из гостевой")).body.comment;
  assert.ok(hello.id);
  assert.equal(
    (
      await call("/api/blog/comments", {
        method: "POST",
        headers: visitor("7001"),
        body: JSON.stringify({ post: -1, body: "x" }),
      })
    ).status,
    400,
  );
  assert.equal((await guest("7004", "И я тут")).status, 201);
  assert.equal((await mod(OWNER, { action: "pin", comment: hello.id, pin: true })).status, 200);
  const book = (await call("/api/blog/comments?post=0")).body.comments;
  assert.equal(book.length, 2);
  assert.equal(book.filter((c: { pinned: boolean }) => c.pinned).length, 1);
  assert.equal((await mod(OWNER, { action: "comment", comment: hello.id, to: "deleted" })).status, 200);
  assert.equal((await call("/api/blog/comments?post=0")).body.comments.length, 1);

  const postcard = (as: string, data: object) =>
    call("/api/blog/comments", {
      method: "POST",
      headers: visitor(as),
      body: JSON.stringify({ post: 0, body: "Привет с открытки", ...data }),
    });
  const sent = await postcard("7001", { card: { icon: "sun" } });
  assert.equal(sent.status, 201);
  assert.equal(sent.body.comment.card.icon, "sun");
  assert.equal((await postcard("7001", { card: { icon: "bomb" }, body: "Другая" })).status, 400);
  assert.equal(
    (await postcard("7001", { card: { icon: "star" }, parent: sent.body.comment.id })).status,
    400,
  );
  assert.equal((await postcard("7001", { card: { icon: "star" }, body: "x".repeat(141) })).status, 413);
  const withCard = (await call("/api/blog/comments?post=0")).body.comments;
  assert.equal(withCard.find((c: { id: number }) => c.id === sent.body.comment.id).card.icon, "sun");
  const plain = await call("/api/blog/comments", {
    method: "POST",
    headers: visitor("7004"),
    body: JSON.stringify({ post: made.body.id, body: "Открытка к посту", card: { icon: "sun" } }),
  });
  assert.equal(plain.status, 400);
  const map = await call("/api/map");
  assert.equal(map.status, 200);
  assert.equal(typeof map.body.visits, "object");
  assert.equal(typeof map.body.cards, "object");

  const rep = await call("/api/blog/report", {
    method: "POST",
    headers: visitor("7004"),
    body: JSON.stringify({ comment: first.id, reason: "spam: реклама" }),
  });
  assert.equal(rep.status, 200);
  await call("/api/blog/react", {
    method: "POST",
    headers: visitor("7001"),
    body: JSON.stringify({ kind: "post", target: made.body.id, emoji: "🔥" }),
  });
  assert.equal(
    (await call(`/api/blog/react?post=${made.body.id}`, { headers: visitor("7001") })).status,
    403,
  );
  const who = (await call(`/api/blog/react?post=${made.body.id}`, { headers: visitor(OWNER) })).body.people;
  assert.equal(who.length, 1);
  assert.equal(who[0].user.id, "7001");
  assert.equal((await mod(OWNER, { action: "ban", user: "7004", days: 1, reason: "Тест" })).status, 200);
  assert.equal((await mod(OWNER, { action: "ban", user: "7004", days: 7 })).status, 409);
  assert.equal((await comment("7004", "Ещё")).status, 403);
  assert.equal((await mod(OWNER, { action: "unban", user: "7004" })).status, 200);
  assert.equal((await comment("7004", "Снова можно")).status, 201);

  assert.equal((await post(OWNER, { action: "delete", id: made.body.id })).status, 200);
  assert.equal((await call(`/api/blog/posts/${made.body.id}`)).status, 404);
  await send("/api/admin/community", "POST", { action: "settings", value: settings });
});
