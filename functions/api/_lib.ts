export interface Env {
  DB: D1Database;
  TG_CLIENT_ID: string;
  TG_CLIENT_SECRET: string;
  ADMIN_TG_ID: string;
  SESSION_SECRET: string;
  STATS_TZ?: string;
  TG_BOT_TOKEN?: string;
  BOT_SECRET?: string;
  LIVE?: DurableObjectNamespace;
}

import { b64u, unb64u, verify } from "../../shared/token";

export { fingerprint, parseUA } from "../../shared/ua";
export { b64u, sign, unb64u, verify } from "../../shared/token";
export { KEYS, validateContent } from "../../shared/content";
export { shiftDay } from "../../shared/dates";

export type Admin = { sub: string; name: string; sid: string };

const enc = new TextEncoder();
const dec = new TextDecoder();

export const rnd = (n: number) => b64u(crypto.getRandomValues(new Uint8Array(n)));

export const sha256 = async (s: string) => b64u(await crypto.subtle.digest("SHA-256", enc.encode(s)));

export const json = (data: unknown, status = 200, extra: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });

export const getCookie = (req: Request, name: string) =>
  req.headers
    .get("Cookie")
    ?.split(/;\s*/)
    .map((c) => c.split("="))
    .find(([k]) => k === name)?.[1];

export const setCookie = (
  name: string,
  value: string,
  maxAge: number,
  opts: { path?: string; sameSite?: "Lax" | "Strict" } = {},
) =>
  `${name}=${value}; Path=${opts.path ?? "/"}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=${opts.sameSite ?? "Strict"}`;

export const SESSION = "__Host-snak";

export const isAdmin = (env: Env, id: string) =>
  env.ADMIN_TG_ID.split(",")
    .map((s) => s.trim())
    .includes(id);

export type Geo = { ip: string; ua: string; country: string; city: string; org: string };

export function geo(req: Request): Geo {
  const cf = (req.cf ?? {}) as Record<string, string | undefined>;
  return {
    ip: req.headers.get("CF-Connecting-IP") ?? "0.0.0.0",
    ua: (req.headers.get("User-Agent") ?? "").slice(0, 300),
    country: cf.country ?? "??",
    city: cf.city ?? "",
    org: cf.asOrganization ?? "",
  };
}

const offsetOf = (zone: string) => {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
  } catch {
    return undefined;
  }
};

// The IP country counts only when the browser clock agrees with it, so a VPN exit elsewhere is not taken at face value.
export function trustedCountry(req: Request, tz: unknown): string | null {
  const cf = (req.cf ?? {}) as Record<string, string | undefined>;
  if (!cf.country || !cf.timezone || typeof tz !== "string" || !tz || tz.length > 64) return null;
  if (cf.timezone === tz) return cf.country;
  const a = offsetOf(cf.timezone);
  return a && a === offsetOf(tz) ? cf.country : null;
}

export const audit = (env: Env, req: Request, actor: string, action: string, detail = "") => {
  const g = geo(req);
  return env.DB.prepare(
    "INSERT INTO audit(ts,actor,action,detail,ip,ua,country,city) VALUES (?,?,?,?,?,?,?,?)",
  )
    .bind(Date.now(), actor, action, detail.slice(0, 300), g.ip, g.ua, g.country, g.city)
    .run();
};

export const isBlocked = async (env: Env, ip: string) =>
  !!(await env.DB.prepare("SELECT 1 FROM blocked WHERE ip=?").bind(ip).first());

export async function limit(env: Env, key: string, max: number, windowSec: number) {
  const w = Math.floor(Date.now() / 1000 / windowSec);
  const row = await env.DB.prepare(
    "INSERT INTO rate(key,w,n) VALUES(?1,?2,1) ON CONFLICT(key) DO UPDATE SET n = CASE WHEN w=?2 THEN n+1 ELSE 1 END, w=?2 RETURNING n",
  )
    .bind(key, w)
    .first<{ n: number }>();
  return (row?.n ?? 1) <= max;
}

const zone = (env: Env) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: env.STATS_TZ || "UTC" });
    return env.STATS_TZ || "UTC";
  } catch {
    return "UTC";
  }
};

export const statsZone = zone;

export const localDay = (env: Env, ms = Date.now()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: zone(env),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ms);

export const localHour = (env: Env, ms = Date.now()) =>
  Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: zone(env), hour: "2-digit", hourCycle: "h23" }).format(ms),
  );

export async function requireAdmin(req: Request, env: Env): Promise<Admin | Response> {
  const s = await verify<Admin>(getCookie(req, SESSION), env.SESSION_SECRET);
  if (!s || !isAdmin(env, s.sub)) return json({ error: "unauthorized" }, 401);

  const write = req.method !== "GET";
  const sameOrigin = req.headers.get("Origin") === new URL(req.url).origin;
  if (write && (!sameOrigin || req.headers.get("X-Requested-With") !== "snak-admin")) {
    return json({ error: "forbidden" }, 403);
  }

  const row = await env.DB.prepare("SELECT revoked, seen FROM sessions WHERE id=?")
    .bind(s.sid)
    .first<{ revoked: number; seen: number }>();
  if (!row || row.revoked) return json({ error: "unauthorized" }, 401);

  if (Date.now() - row.seen > 5 * 60_000) {
    const g = geo(req);
    await env.DB.prepare("UPDATE sessions SET seen=?, last_ip=?, last_country=? WHERE id=?")
      .bind(Date.now(), g.ip, g.country, s.sid)
      .run();
  }
  return s;
}

export async function verifyIdToken(token: string, audience: string): Promise<Record<string, any> | null> {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return null;
  try {
    const header = JSON.parse(dec.decode(unb64u(h)));
    if (header.alg !== "RS256") return null;
    const res = await fetch("https://oauth.telegram.org/.well-known/jwks.json", {
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    const jwks = (await res.json()) as { keys: any[] };
    const jwk = jwks.keys.find((k) => k.kid === header.kid && k.kty === "RSA");
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, unb64u(s), enc.encode(`${h}.${p}`));
    if (!valid) return null;
    const claims = JSON.parse(dec.decode(unb64u(p)));
    const now = Date.now() / 1000;
    const audiences = ([] as unknown[]).concat(claims.aud).map(String);
    const fine =
      claims.iss === "https://oauth.telegram.org" &&
      claims.exp > now &&
      claims.iat <= now + 60 &&
      audiences.includes(audience);
    return fine ? claims : null;
  } catch {
    return null;
  }
}

export const deniedPage = (ru: string, en: string, status = 403) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>403</title>` +
      `<body style="margin:0;font:16px system-ui;background:#1b1c1f;color:#ececee;display:grid;place-content:center;min-height:100vh;text-align:center;padding:1rem">` +
      `<div><h1 style="font-size:1.6rem">Доступ закрыт</h1><p>${ru}</p><p style="color:#9b9da5">${en}</p>` +
      `<a style="color:#a78bfa" href="/">На главную</a></div>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );

// Optional: tells the owner about new devices and foreign sign-in attempts. Needs TG_BOT_TOKEN and a chat started with the bot.
export async function notify(env: Env, text: string) {
  const chat = env.ADMIN_TG_ID.split(",")[0]?.trim();
  if (!env.TG_BOT_TOKEN || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: text.slice(0, 900), disable_web_page_preview: true }),
    });
  } catch {
    // a failed notification must never break the sign in
  }
}
