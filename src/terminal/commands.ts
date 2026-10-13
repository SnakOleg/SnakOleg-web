import { STAMPS } from "../../shared/stamps";
import { site } from "../config";
import { tx } from "../lib/i18n";
import type { L } from "../lib/i18n";
import { SKIES } from "../weather/prefs";
import { openGames } from "../games/client";
import { found, openPassport } from "../stamps/client";
import { HOME, list, resolve, stat } from "./fs";
import { text } from "./text";

export type Line = string | { t: string; c?: "mx" | "err" | "ok" | "dim" };

export type Ctx = {
  l: L;
  user: string;
  cwd: string;
  history: string[];
  earned: () => number;
  print: (lines: Line | Line[]) => void;
  later: (lines: Line[], ms: number) => Promise<void>;
  setCwd: (p: string) => void;
  clear: () => void;
  close: () => void;
  vim: () => void;
  setTheme: (m: "auto" | "light" | "dark") => void;
  setLang: (l: L) => void;
  setSky: (s: string) => boolean;
  toggleRetro: () => boolean;
  go: (href: string) => void;
};

type Run = (args: string[], c: Ctx, raw: string) => void | Promise<void>;

const PAGES: Record<string, string> = {
  home: "/",
  uses: "/uses",
  blog: "/blog",
  guestbook: "/blog/guestbook",
};

const COW = [
  "        \\   ^__^",
  "         \\  (oo)\\_______",
  "            (__)\\       )\\/\\",
  "                ||----w |",
  "                ||     ||",
];

const rainLine = (n: number) =>
  Array.from({ length: n }, () =>
    Math.random() < 0.18
      ? " "
      : String.fromCharCode(
          Math.random() < 0.7 ? 0xff71 + Math.floor(Math.random() * 50) : 48 + Math.floor(Math.random() * 10),
        ),
  ).join("");

async function rm(c: Ctx) {
  const t = text(c.l);
  await c.later(
    [
      "rm: removing /usr/bin ...",
      "rm: removing /etc ...",
      "rm: removing /home/guest/projects ...",
      "rm: removing /var/www ...",
      { t: "rm: removing the internet ...", c: "err" },
    ],
    260,
  );
  c.print({ t: t.rmDone, c: "ok" });
  found("rmrf");
}

async function hack(c: Ctx) {
  const t = text(c.l);
  for (const p of [0, 17, 42, 68, 91, 100]) {
    c.print({ t: `[${"#".repeat(p / 5).padEnd(20, ".")}] ${p}%`, c: "mx" });
    await new Promise((r) => setTimeout(r, 280));
  }
  if (Math.random() < 0.25) return c.print({ t: t.hackFail, c: "err" });
  c.print({ t: t.hackDone, c: "ok" });
  found("hacker");
}

async function matrix(c: Ctx) {
  const lines: Line[] = Array.from({ length: 16 }, () => ({ t: rainLine(46), c: "mx" as const }));
  await c.later(lines, 110);
  found("matrix");
}

const about: Run = (_a, c) => c.print(tx(site.about, c.l));

const REGISTRY: Record<string, Run> = {
  help: (_a, c) => c.print(text(c.l).help),
  about,
  whoami: (_a, c) => c.print(c.user),
  skills: (_a, c) => c.print(site.hard.map((g) => `${tx(g.group, "en").padEnd(9)} ${g.items.join(", ")}`)),
  projects: (_a, c) =>
    c.print(
      site.projects.map(
        (p) => `${p.name.padEnd(16)} ${tx(p.status ?? "", c.l)}  ${p.tags.slice(0, 3).join(", ")}`,
      ),
    ),
  contacts: (_a, c) => c.print(site.contacts.map((x) => `${tx(x.label, c.l).padEnd(14)} ${x.href}`)),
  pwd: (_a, c) => c.print(c.cwd),
  ls: (a, c) => {
    const t = text(c.l);
    const all = a.some((x) => /^-[a-z]*a/.test(x));
    const target = a.find((x) => !x.startsWith("-"));
    const path = resolve(c.cwd, target ?? ".");
    const e = stat(path);
    if (!e) return c.print({ t: t.noFile(target ?? path), c: "err" });
    if (!e.dir) return c.print(target!);
    c.print((all ? [".", ".."] : []).concat(list(path, all)).join("  ") || " ");
  },
  cd: (a, c) => {
    const t = text(c.l);
    const path = resolve(c.cwd, a[0]);
    const e = stat(path);
    if (!e) return c.print({ t: t.noFile(a[0]), c: "err" });
    if (!e.dir) return c.print({ t: t.notDir(a[0]), c: "err" });
    c.setCwd(path);
  },
  cat: (a, c) => {
    const t = text(c.l);
    if (!a[0]) return c.print(t.catUsage);
    const path = resolve(c.cwd, a[0]);
    if (path === "/etc/shadow") return c.print({ t: t.denied(a[0]), c: "err" });
    const e = stat(path);
    if (!e) return c.print({ t: t.noFile(a[0]), c: "err" });
    if (e.dir) return c.print({ t: t.isDir(a[0]), c: "err" });
    c.print(e.read(c.l));
    if (path === `${HOME}/.secret`) found("hidden");
  },
  echo: (a, c) => c.print(a.join(" ")),
  date: (_a, c) => c.print(new Date().toString()),
  uname: (_a, c) => c.print("snakOS 1.0 (Cloudflare edge) preact/ts"),
  uptime: (_a, c) => c.print(`up ${Math.round(performance.now() / 1000)} seconds`),
  history: (_a, c) => c.print(c.history.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`)),
  clear: (_a, c) => c.clear(),
  exit: (_a, c) => c.close(),
  open: (a, c) => {
    const t = text(c.l);
    const to = PAGES[a[0] ?? ""];
    if (!to) return c.print(t.openUsage);
    c.print(t.opening(a[0]));
    c.go(to);
  },
  theme: (a, c) => {
    const t = text(c.l);
    if (a[0] !== "auto" && a[0] !== "light" && a[0] !== "dark") return c.print(t.themeUsage);
    c.setTheme(a[0]);
    c.print(t.themeNow(a[0]));
  },
  lang: (a, c) => {
    const t = text(c.l);
    if (a[0] !== "ru" && a[0] !== "en") return c.print(t.langUsage);
    c.setLang(a[0]);
    c.print(a[0] === "ru" ? "Язык: русский" : "Language: English");
  },
  weather: (a, c) => {
    const t = text(c.l);
    if (!a[0] || !c.setSky(a[0])) return c.print(`${t.skyUsage}\n(${SKIES.join(", ")})`);
    c.print(t.skyNow(a[0]));
  },
  retro: (_a, c) => c.print(c.toggleRetro() ? text(c.l).retroOn : text(c.l).retroOff),
  passport: (_a, c) => {
    c.print(text(c.l).stamps(c.earned(), STAMPS.length));
    c.close();
    openPassport();
  },
  word: (_a, c) => {
    c.close();
    openGames("word");
  },
  garden: (_a, c) => {
    c.close();
    openGames("garden");
  },
  capsule: (_a, c) => {
    c.close();
    openGames("capsule");
  },
  reaction: (_a, c) => {
    c.close();
    openGames("reaction");
  },
  stamps: (_a, c) => REGISTRY.passport(_a, c, ""),
  man: (a, c) => c.print(a[0] ? `No manual entry for ${a[0]}. Try help.` : "What manual page do you want?"),
  ping: (_a, c) =>
    c.later(
      [
        "PING snak (127.0.0.1): 56 data bytes",
        "64 bytes: icmp_seq=0 ttl=64 time=0.042 ms",
        "64 bytes: icmp_seq=1 ttl=64 time=0.039 ms",
      ],
      350,
    ),
  ssh: (_a, c) => c.print({ t: "Permission denied (publickey).", c: "err" }),
  git: (_a, c) => c.print("On branch main\nnothing to commit, working tree clean"),
  npm: (_a, c) => c.print("added 1337 packages, and found 0 vulnerabilities (trust me)"),
  neofetch: (_a, c) =>
    c.print([
      "  /\\_/\\     guest@snak",
      " ( o.o )    ----------",
      "  > ^ <     OS: snakOS 1.0",
      "            Host: Cloudflare Pages + D1",
      "            Shell: snaksh",
      "            Stack: TypeScript, Preact, Vite",
      `            Language: ${c.l}`,
    ]),
  fastfetch: (_a, c) => {
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua)
      ? "Edge"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "?";
    const os = /Windows/.test(ua)
      ? "Windows"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Mac OS/.test(ua)
            ? "macOS"
            : /Linux/.test(ua)
              ? "Linux"
              : "?";
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const logo = ["   ____", "  / __/", " _\\ \\", "/___/"];
    const info = [
      "guest@snak",
      "----------",
      `OS: ${os}`,
      `Browser: ${browser}`,
      `Resolution: ${screen.width}x${screen.height} @${devicePixelRatio}x`,
      `CPU: ${navigator.hardwareConcurrency || "?"} threads`,
      ...(mem ? [`Memory: ${mem} GiB (or more)`] : []),
      `Locale: ${navigator.language}`,
      `Uptime: ${Math.round(performance.now() / 1000)}s on this page`,
    ];
    c.print(info.map((x, i) => `${(logo[i] ?? "").padEnd(10)} ${x}`));
  },
  rm: (a, c) => (a.includes("-rf") || a.includes("-fr") ? rm(c) : c.print("rm: missing operand")),
  hack: (_a, c) => hack(c),
  matrix: (_a, c) => matrix(c),
  coffee: (_a, c) => {
    c.print(["HTTP/1.1 418 I'm a teapot", "The requested entity body is short and stout."]);
    found("teapot");
  },
  vim: (_a, c) => c.vim(),
  cowsay: (a, c) => {
    if (!a.length) return c.print(text(c.l).cowAsk);
    const msg = a.join(" ").slice(0, 40);
    c.print([` ${"_".repeat(msg.length + 2)}`, `< ${msg} >`, ` ${"-".repeat(msg.length + 2)}`, ...COW]);
    found("cowsay");
  },
  snak: (_a, c) => {
    c.print(text(c.l).origin);
    found("origin");
  },
  meow: (_a, c) => c.print("meow"),
};

const ALIAS: Record<string, string> = {
  vi: "vim",
  nano: "vim",
  emacs: "vim",
  quit: "exit",
  logout: "exit",
  brew: "coffee",
  nmap: "hack",
  sqlmap: "hack",
  exploit: "hack",
  yarn: "npm",
  pnpm: "npm",
  dir: "ls",
  clr: "clear",
};

export const NAMES = Object.keys(REGISTRY).filter((n) => !["stamps", "meow"].includes(n));

export async function run(raw: string, c: Ctx) {
  const t = text(c.l);
  const line = raw.trim();
  if (!line) return;
  const words = line.split(/\s+/);
  const low = line.toLowerCase();

  if (/(life.*universe.*everything|ultimate question|^42$|^answer$)/.test(low)) {
    c.print("42");
    found("answer");
    return;
  }
  if (/^(whois|who is|who's|кто такой|кто такая)\s+(snak|снак)/.test(low)) return REGISTRY.snak([], c, line);
  if (/^(sudo\s+)?make me a sandwich$/.test(low) || /^please make me a sandwich$/.test(low)) {
    if (low.startsWith("sudo")) found("sudo");
    c.print({ t: t.sandwich, c: "ok" });
    found("sandwich");
    return;
  }
  if (low === "make me a sandwich") return c.print(t.noSandwich);
  if (/^(make|brew)\s+coffee$/.test(low)) return REGISTRY.coffee([], c, line);
  if (words[0] === "sudo") {
    if (words[1] === "rm" && (words.includes("-rf") || words.includes("-fr"))) return rm(c);
    c.print({ t: t.sudo, c: "err" });
    found("sudo");
    return;
  }
  if (words[0].startsWith("curl") && /brew/i.test(line)) return REGISTRY.coffee([], c, line);
  if (/^:?(q|wq|x)!?$/.test(low) || low === "zz") return c.print(t.vimHint);

  const name = ALIAS[words[0]] ?? words[0];
  const cmd = Object.hasOwn(REGISTRY, name) ? REGISTRY[name] : undefined;
  if (!cmd) return c.print({ t: t.notFound(words[0]), c: "err" });
  await cmd(words.slice(1), c, line);
}
