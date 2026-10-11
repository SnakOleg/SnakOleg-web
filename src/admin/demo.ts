const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 99991, 7);
const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

const iso = (offset = 0) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);

function viewsFor(date: string) {
  const weekend = [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay());
  const age = (Date.now() - Date.parse(date)) / 864e5;
  return Math.max(
    2,
    Math.round(16 + (weekend ? -6 : 6) + rand(hash(date)) * 18 + Math.max(0, 40 - age) * 0.25),
  );
}

const share = (total: number, names: string[], weights: number[]): [string, number][] =>
  names.map((n, i) => [n, Math.round(total * weights[i])]);

const MORE_REFS = [
  "duckduckgo.com",
  "yandex.ru",
  "habr.com",
  "vk.com",
  "twitter.com",
  "reddit.com",
  "dev.to",
  "medium.com",
  "discord.com",
  "news.ycombinator.com",
  "stackoverflow.com",
  "bing.com",
  "pikabu.ru",
  "dzen.ru",
  "instagram.com",
  "kagi.com",
];
const MORE_COUNTRIES = ["PL", "FR", "GB", "TR", "BY", "GE", "AM", "FI", "IT", "ES", "CZ", "LT"];
const MORE_CLICKS = [
  "t.me/SnakOleg",
  "instagram.com/chonkia12",
  "t.me/Foiler993",
  "namix-site.pages.dev",
  "sandbox-40f.pages.dev",
  "matrixbot-web.pages.dev",
  "github.com/SnakOleg/hotel",
  "github.com/SnakOleg/matrixbot-api",
  "github.com/SnakOleg/Sandbox",
  "github.com/SnakOleg/namix-site",
];

function tops(total: number) {
  const extra = (names: string[], base: number): [string, number][] =>
    names.map((n, i) => [n, Math.max(1, Math.round((base * (names.length - i)) / (names.length * 3)))]);
  const base = {
    ref: share(
      total,
      ["direct", "t.me", "github.com", "linkedin.com", "google.com", "hh.ru"],
      [0.42, 0.27, 0.14, 0.08, 0.06, 0.03],
    ),
    country: share(total, ["RU", "NL", "DE", "US", "KZ", "UA"], [0.46, 0.18, 0.1, 0.09, 0.07, 0.05]),
    device: share(total, ["desktop", "mobile", "tablet"], [0.58, 0.38, 0.04]),
    lang: share(total, ["ru", "en"], [0.78, 0.22]),
    path: share(total, ["/"], [1]),
    click: share(
      total,
      [
        "t.me/the_nikeri",
        "github.com/SnakOleg",
        "foxochat.app",
        "wakatime.com/@snakoleg",
        "linkedin.com/in/snakoleg",
        "hotel-aql.pages.dev",
      ],
      [0.1, 0.09, 0.07, 0.05, 0.045, 0.04],
    ),
  };
  return {
    ...base,
    ref: [...base.ref, ...extra(MORE_REFS, total * 0.15)],
    country: [...base.country, ...extra(MORE_COUNTRIES, total * 0.12)],
    click: [...base.click, ...extra(MORE_CLICKS, total * 0.1)],
  };
}

function stats(days: number, only: boolean) {
  const series = Array.from({ length: days }, (_, i) => {
    const day = iso(-(days - 1 - i));
    const views = viewsFor(day);
    return { day, views, visitors: Math.round(views * (0.55 + rand(hash(day) + 3) * 0.15)) };
  });
  const total = series.reduce((a, d) => a + d.views, 0);
  const top = only ? {} : tops(total);
  const clicks = only ? 0 : (top as ReturnType<typeof tops>).click.reduce((a, c) => a + c[1], 0);
  return { days, today: iso(), series, top, clicks };
}

function day(date: string) {
  const views = viewsFor(date);
  const weights = Array.from(
    { length: 24 },
    (_, h) => (h < 7 ? 0.2 : h > 17 ? 1.6 : 1) * (0.5 + rand(hash(date) + h)),
  );
  const sum = weights.reduce((a, b) => a + b, 0);
  return {
    date,
    views,
    visitors: Math.round(views * 0.62),
    hours: weights.map((w) => Math.round((w / sum) * views)),
    top: { ...tops(views), path: [] as [string, number][] },
  };
}

const store = new Map<
  string,
  { value: unknown; hist: { version: number; ts: number; actor: string; note: string; value: unknown }[] }
>();

const audit = [
  {
    ts: Date.now() - 36e5,
    actor: "demo",
    action: "login",
    detail: "",
    ip: "93.184.216.34",
    country: "NL",
    city: "Amsterdam",
  },
  {
    ts: Date.now() - 864e5,
    actor: "demo",
    action: "content_save",
    detail: "projects v3",
    ip: "93.184.216.34",
    country: "NL",
    city: "Amsterdam",
  },
  {
    ts: Date.now() - 3 * 864e5,
    actor: "999000111",
    action: "login_denied",
    detail: "",
    ip: "203.0.113.45",
    country: "DE",
    city: "Berlin",
  },
];

const chromeMac =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const iphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const winFox = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0";

const sessions = [
  {
    id: "me0001",
    name: "Demo",
    created: Date.now() - 36e5,
    seen: Date.now() - 6e4,
    ip: "93.184.216.34",
    last_ip: "93.184.216.34",
    country: "NL",
    last_country: "NL",
    city: "Amsterdam",
    org: "Example Telecom",
    ua: chromeMac,
    revoked: 0,
  },
  {
    id: "ph0002",
    name: "Demo",
    created: Date.now() - 4 * 864e5,
    seen: Date.now() - 5 * 36e5,
    ip: "93.184.216.99",
    last_ip: "93.184.216.99",
    country: "NL",
    last_country: "NL",
    city: "Amsterdam",
    org: "Example Mobile",
    ua: iphone,
    revoked: 0,
  },
  {
    id: "wn0003",
    name: "Demo",
    created: Date.now() - 864e5,
    seen: Date.now() - 2 * 36e5,
    ip: "198.51.100.7",
    last_ip: "192.0.2.80",
    country: "BR",
    last_country: "RU",
    city: "Sao Paulo",
    org: "Unknown Hosting",
    ua: winFox,
    revoked: 0,
  },
  {
    id: "old004",
    name: "Demo",
    created: Date.now() - 12 * 864e5,
    seen: Date.now() - 11 * 864e5,
    ip: "93.184.216.34",
    last_ip: "93.184.216.34",
    country: "NL",
    last_country: "NL",
    city: "Amsterdam",
    org: "Example Telecom",
    ua: chromeMac,
    revoked: 1,
  },
];

const presetRows = [
  {
    id: 3,
    name: "Ночной лес",
    author: "Mira",
    comment: "Спокойная тёмная тема для вечера",
    palette: { bg: "#0f1a14", surf: "#16261d", ink: "#e7f3ea", acc: "#6ee7a0", acc2: "#f0c75e" },
    status: "pending",
    created: Date.now() - 36e5,
    user_id: "101",
    uname: "Анна",
    username: "anna_k",
    banned: 0,
  },
  {
    id: 2,
    name: "Сливочная",
    author: "Аноним",
    comment: "",
    palette: { bg: "#f6efe6", surf: "#fffaf3", ink: "#33291f", acc: "#a3481f", acc2: "#4a6fa5" },
    status: "pending",
    created: Date.now() - 5 * 36e5,
  },
  {
    id: 1,
    name: "Неон",
    author: "Kai",
    comment: "Для любителей киберпанка",
    palette: { bg: "#0b0b14", surf: "#14142a", ink: "#e8f0ff", acc: "#00f0ff", acc2: "#ff2bd6" },
    status: "approved",
    created: Date.now() - 3 * 864e5,
  },
];

const attempts = [
  {
    ts: Date.now() - 3 * 864e5,
    actor: "999000111",
    ip: "203.0.113.45",
    ua: winFox,
    country: "DE",
    city: "Berlin",
  },
];
let blocked: { ip: string; ts: number; reason: string }[] = [];

type Init = { method?: string; body?: any };

function content(url: URL, init: Init) {
  const key = url.searchParams.get("key") ?? init.body?.key;
  const entry = store.get(key) ?? { value: null, hist: [] };
  const version = entry.hist[0]?.version ?? 0;
  const method = init.method ?? "GET";
  const push = (value: unknown, note: string, action: string) => {
    entry.hist.unshift({ version: version + 1, ts: Date.now(), actor: "demo", note, value });
    store.set(key, { value: note === "reset" ? null : value, hist: entry.hist });
    audit.unshift({
      ts: Date.now(),
      actor: "demo",
      action,
      detail: `${key} v${version + 1}`,
      ip: "93.184.216.34",
      country: "NL",
      city: "Amsterdam",
    });
    return { ok: true, version: version + 1 };
  };
  if (method === "GET") {
    const asked = Number(url.searchParams.get("version"));
    if (asked) return { version: asked, value: entry.hist.find((h) => h.version === asked)?.value ?? null };
    return {
      value: entry.value,
      saved: entry.value !== null,
      version,
      history: entry.hist.map(({ version: v, ts, actor, note }) => ({ version: v, ts, actor, note })),
    };
  }
  if (method === "DELETE") return push(null, "reset", "content_reset");
  if (method === "PUT") return push(init.body.value, "save", "content_save");
  const old = entry.hist.find((h) => h.version === init.body.version);
  return push(old?.value, `restore:${init.body.version}`, "content_restore");
}

function sessionAction(body: any) {
  if (body.action === "revoke") sessions.forEach((s) => s.id === body.id && (s.revoked = 1));
  if (body.action === "revoke_others") sessions.forEach((s) => s.id !== "me0001" && (s.revoked = 1));
  if (body.action === "revoke_all") sessions.forEach((s) => (s.revoked = 1));
  if (body.action === "block")
    blocked = [{ ip: body.ip, ts: Date.now(), reason: body.reason ?? "" }, ...blocked];
  if (body.action === "unblock") blocked = blocked.filter((b) => b.ip !== body.ip);
  return { ok: true };
}

type DPost = {
  id: number;
  title: string;
  body: string;
  tags: string[];
  cover: string;
  pinned: number;
  status: string;
  pub: number;
  updated: number;
  views: number;
  comments_open: number;
};
const dPosts: DPost[] = [
  {
    id: 2,
    title: "Как я делаю ботов быстрее",
    body: "## Коротко\n\nСобираю **шаблон** и не трогаю его.\n\n> [!TIP]\n> Кэшируйте всё.\n\n||спойлер||",
    tags: ["боты", "код"],
    cover: "",
    pinned: 1,
    status: "published",
    pub: Date.now() - 864e5,
    updated: Date.now() - 864e5,
    views: 128,
    comments_open: 1,
  },
  {
    id: 1,
    title: "Привет, это мой блог",
    body: "Первый пост.",
    tags: ["заметки"],
    cover: "",
    pinned: 0,
    status: "draft",
    pub: Date.now() - 5 * 864e5,
    updated: Date.now() - 5 * 864e5,
    views: 0,
    comments_open: 1,
  },
];
const dUsers = [
  {
    id: "101",
    name: "Анна",
    username: "anna_k",
    created: Date.now() - 9 * 864e5,
    seen: Date.now() - 36e5,
    comments: 12,
    trusted: 1,
    flagged: 0,
    themes: 2,
    ban: null as string | null,
  },
  {
    id: "102",
    name: "Crypto Pump",
    username: "pump_now",
    created: Date.now() - 864e5,
    seen: Date.now() - 6e5,
    comments: 3,
    trusted: 0,
    flagged: 3,
    themes: 0,
    ban: null as string | null,
  },
];
const dComments = [
  {
    id: 11,
    post: "Как я делаю ботов быстрее",
    user_id: "102",
    body: "Зарабатывай 500$ в день t.me/+abcdef",
    status: "flagged",
    flags: ["links", "invite"],
    reports: 2,
    created: Date.now() - 6e5,
    name: "Crypto Pump",
    username: "pump_now",
    total: 3,
    banned: 0,
  },
  {
    id: 12,
    post: "Как я делаю ботов быстрее",
    user_id: "101",
    body: "Отличный пост, спасибо!",
    status: "pending",
    flags: [],
    reports: 0,
    created: Date.now() - 36e5,
    name: "Анна",
    username: "anna_k",
    total: 12,
    banned: 0,
  },
];
let dBans: {
  id: number;
  user_id: string;
  scope: string;
  reason: string;
  created: number;
  until: number | null;
  lifted: number;
  name: string;
  username: string;
}[] = [];
let dSettings = {
  commentsOpen: true,
  slowMode: 10,
  premod: false,
  perDay: 40,
  themesOpen: true,
  themesPerDay: 3,
};

function blogDemo(url: URL, init: Init) {
  if (init.method !== "POST") {
    const id = Number(url.searchParams.get("id"));
    if (id) return { post: dPosts.find((p) => p.id === id) };
    return { posts: dPosts, now: Date.now() };
  }
  const b = init.body;
  if (b.action === "delete") dPosts.splice(0, dPosts.length, ...dPosts.filter((p) => p.id !== b.id));
  else {
    const now = Date.now();
    const next = {
      title: b.title,
      body: b.body,
      tags: b.tags,
      cover: b.cover,
      pinned: b.pinned ? 1 : 0,
      status: b.status,
      comments_open: b.commentsOpen ? 1 : 0,
      updated: now,
      pub: b.publishAt ?? now,
    };
    const row = dPosts.find((p) => p.id === b.id);
    if (row) Object.assign(row, next);
    else dPosts.unshift({ id: Math.max(0, ...dPosts.map((p) => p.id)) + 1, views: 0, ...next });
  }
  return { ok: true };
}

function communityDemo(url: URL, init: Init) {
  const q = url.searchParams;
  const now = Date.now();
  if (init.method === "POST") {
    const b = init.body;
    const user = dUsers.find((u) => u.id === b.user);
    if (b.action === "comment") {
      const c = dComments.find((x) => x.id === b.id);
      if (c) c.status = b.to;
    }
    if (b.action === "ban" && user) {
      const until = b.days ? now + b.days * 864e5 : null;
      dBans.unshift({
        id: now,
        user_id: user.id,
        scope: b.scope,
        reason: b.reason,
        created: now,
        until,
        lifted: 0,
        name: user.name,
        username: user.username,
      });
      user.ban = `${b.scope}|${until ?? 0}|${b.reason}`;
      dComments.forEach((c) => c.user_id === user.id && c.banned !== undefined && (c.banned = 1));
      if (b.purge) dComments.forEach((c) => c.user_id === user.id && (c.status = "deleted"));
    }
    if (b.action === "unban" && user) {
      dBans.forEach((x) => x.user_id === user.id && (x.lifted = 1));
      user.ban = null;
      dComments.forEach((c) => c.user_id === user.id && (c.banned = 0));
    }
    if (b.action === "trust" && user) user.trusted = b.on ? 1 : 0;
    if (b.action === "purge") dComments.forEach((c) => c.user_id === b.user && (c.status = "deleted"));
    if (b.action === "deleteUser") dUsers.splice(0, dUsers.length, ...dUsers.filter((u) => u.id !== b.user));
    if (b.action === "settings") dSettings = { ...dSettings, ...b.value };
    return { ok: true };
  }
  const tab = q.get("tab");
  if (tab === "comments") {
    const st = q.get("status") ?? "flagged";
    return {
      comments: dComments.filter((c) =>
        st === "all" ? true : st === "reported" ? c.reports > 0 && c.status !== "deleted" : c.status === st,
      ),
    };
  }
  if (tab === "users") {
    const t = (q.get("q") ?? "").toLowerCase();
    return { users: dUsers.filter((u) => !t || (u.name + (u.username ?? "")).toLowerCase().includes(t)) };
  }
  if (tab === "bans") return { bans: dBans, now };
  const n = (st: string) => dComments.filter((c) => c.status === st).length;
  return {
    counts: {
      flagged: n("flagged"),
      pending: n("pending"),
      reported: dComments.filter((c) => c.reports > 0 && c.status !== "deleted").length,
      users: dUsers.length,
      bans: dBans.filter((b) => !b.lifted).length,
      themes: presetRows.filter((p) => p.status === "pending").length,
    },
    settings: dSettings,
  };
}

export async function demoApi(path: string, init: Init) {
  await new Promise((resolve) => setTimeout(resolve, 120));
  const url = new URL(path, "http://demo");
  switch (url.pathname) {
    case "/api/auth/me":
      return { name: "Demo", id: "0" };
    case "/api/admin/stats":
      return stats(Number(url.searchParams.get("days")) || 30, url.searchParams.get("only") === "series");
    case "/api/admin/day":
      return day(url.searchParams.get("date") ?? iso());
    case "/api/admin/status":
      return {
        zone: "Europe/Amsterdam",
        today: { views: viewsFor(iso()), visitors: 9 },
        lastEventDay: iso(),
        sections: [...store.keys()].map((key) => ({
          key,
          version: store.get(key)!.hist[0]?.version ?? 0,
          updated_at: Date.now(),
        })),
        previousLogin: Date.now() - 2 * 864e5,
        activeSessions: sessions.filter((s) => !s.revoked).length,
        pendingPresets: presetRows.filter((p) => p.status === "pending").length,
        env: { telegram: true, secret: true, admin: true, notifications: false },
      };
    case "/api/admin/audit":
      return { rows: audit };
    case "/api/admin/sessions":
      return init.method === "POST"
        ? sessionAction(init.body)
        : { me: "me0001", sessions, attempts, blocked };
    case "/api/admin/blog":
      return blogDemo(url, init);
    case "/api/admin/community":
      return communityDemo(url, init);
    case "/api/admin/presets": {
      if (init.method !== "POST")
        return { presets: presetRows, accepting: true, limits: { pending: 100, total: 300, perHour: 5 } };
      const row = presetRows.find((p) => p.id === init.body.id);
      if (!row) return { error: "not found" };
      if (init.body.action === "delete") presetRows.splice(presetRows.indexOf(row), 1);
      else {
        if (init.body.name)
          Object.assign(row, { name: init.body.name, author: init.body.author, comment: init.body.comment });
        if (init.body.action === "approve") row.status = "approved";
        if (init.body.action === "reject") row.status = "rejected";
      }
      return { ok: true };
    }
    case "/api/admin/links": {
      const urls: string[] = init.body?.urls ?? [];
      return {
        results: urls.map((url, i) => ({
          url,
          status: url.includes("linkedin") ? 999 : i === 4 ? 404 : 200,
          ms: 90 + ((i * 37) % 300),
        })),
      };
    }
    case "/api/admin/content":
      return content(url, init);
    default:
      return {};
  }
}
