import { DEFAULT_SETTINGS, cleanLine, normalizeSettings } from "../../shared/blog";
import type { BlogSettings } from "../../shared/blog";
import { Env, getCookie, isAdmin, json, setCookie, sha256, verify } from "./_lib";

export const USER_COOKIE = "__Host-snak-u";
export const USER_TTL = 30 * 86400;
export const USER_COOKIE_DELETE = setCookie(USER_COOKIE, "", 0, { sameSite: "Lax" });

export type User = {
  id: string;
  name: string;
  username: string;
  picture: string;
  owner: boolean;
  trusted: boolean;
  created: number;
};
export type Ban = { id: number; scope: string; reason: string; until: number | null };

type Row = Omit<User, "owner" | "trusted"> & { trusted: number };

export async function getUser(req: Request, env: Env): Promise<User | null> {
  const t = await verify<{ t: string; sub: string }>(getCookie(req, USER_COOKIE), env.SESSION_SECRET);
  if (!t || t.t !== "u") return null;
  const row = await env.DB.prepare("SELECT id,name,username,picture,created,trusted FROM users WHERE id=?")
    .bind(t.sub)
    .first<Row>();
  if (!row) return null;
  return { ...row, trusted: !!row.trusted, owner: isAdmin(env, row.id) };
}

/** Writes need a same-origin request that carries our header (a cheap CSRF barrier on top of SameSite). */
export const sameOriginWrite = (req: Request) =>
  req.headers.get("Origin") === new URL(req.url).origin && req.headers.get("X-Requested-With") === "snak";

export async function requireUser(req: Request, env: Env): Promise<User | Response> {
  if (!sameOriginWrite(req)) return json({ error: "forbidden" }, 403);
  const u = await getUser(req, env);
  return u ?? json({ error: "login" }, 401);
}

export async function activeBan(env: Env, userId: string, scope: "blog" | "themes"): Promise<Ban | null> {
  if (isAdmin(env, userId)) return null;
  return env.DB.prepare(
    "SELECT id,scope,reason,until FROM bans WHERE user_id=?1 AND lifted=0 AND scope IN (?2,'all') AND (until IS NULL OR until>?3) ORDER BY until IS NULL DESC, until DESC LIMIT 1",
  )
    .bind(userId, scope, Date.now())
    .first<Ban>();
}

export const banBody = (b: Ban) => ({
  error: "banned",
  ban: { scope: b.scope, reason: b.reason, until: b.until },
});

export async function getSettings(env: Env): Promise<BlogSettings> {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='blog'").first<{ value: string }>();
  if (!row) return { ...DEFAULT_SETTINGS };
  try {
    return normalizeSettings(JSON.parse(row.value));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export const hashIp = async (env: Env, ip: string) =>
  (await sha256(`${env.SESSION_SECRET}|${ip}`)).slice(0, 16);

export const publicUser = (u: { id: string; name: string; username: string; picture: string }, env: Env) => ({
  id: u.id,
  name: u.name,
  username: u.username,
  picture: u.picture,
  owner: isAdmin(env, u.id),
});

/** Only https pictures from Telegram's CDN are stored; anything else is dropped. */
export const safePicture = (v: unknown) => {
  try {
    const u = new URL(String(v));
    return u.protocol === "https:" && /(^|\.)(telegram\.org|telegram-cdn\.org|t\.me)$/.test(u.hostname)
      ? u.href
      : "";
  } catch {
    return "";
  }
};

export const safeReturn = (v: string | null) => (v && /^\/(?!\/)[\w\-./?=&%#]*$/.test(v) ? v : "/blog");

/** Removes an account: comments are blanked, reactions and reports go, bans stay on record. */
export const eraseUser = (env: Env, id: string) =>
  env.DB.batch([
    env.DB.prepare("UPDATE comments SET status='deleted', body='' WHERE user_id=?").bind(id),
    env.DB.prepare("DELETE FROM reactions WHERE user_id=?").bind(id),
    env.DB.prepare("DELETE FROM reports WHERE user_id=?").bind(id),
    env.DB.prepare("DELETE FROM stamps WHERE user_id=?").bind(id),
    env.DB.prepare("DELETE FROM games WHERE user_id=?").bind(id),
    env.DB.prepare("DELETE FROM garden WHERE user_id=?").bind(id),
    env.DB.prepare("DELETE FROM capsules WHERE user_id=?").bind(id),
    env.DB.prepare("DELETE FROM users WHERE id=?").bind(id),
  ]);

export async function banUser(
  env: Env,
  o: { user: string; scope: string; days: number | null; reason: unknown; purge?: boolean },
): Promise<{ error: string; status: number } | null> {
  if (!["blog", "themes", "all"].includes(o.scope)) return { error: "bad scope", status: 400 };
  if (isAdmin(env, o.user)) return { error: "Владельца нельзя заблокировать", status: 400 };
  const target = await env.DB.prepare("SELECT 1 FROM users WHERE id=?").bind(o.user).first();
  if (!target) return { error: "Пользователь не найден", status: 404 };
  const now = Date.now();
  const active = await env.DB.prepare(
    "SELECT 1 FROM bans WHERE user_id=? AND lifted=0 AND scope IN (?,'all') AND (until IS NULL OR until>?)",
  )
    .bind(o.user, o.scope, now)
    .first();
  if (active) return { error: "Уже заблокирован. Сначала снимите текущий бан.", status: 409 };
  const days = o.days && o.days > 0 ? Math.min(3650, o.days) : null;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO bans(user_id,scope,reason,created,until) VALUES (?,?,?,?,?)").bind(
      o.user,
      o.scope,
      cleanLine(o.reason, 200),
      now,
      days ? now + days * 864e5 : null,
    ),
    ...(o.purge
      ? [env.DB.prepare("UPDATE comments SET status='deleted', body='' WHERE user_id=?").bind(o.user)]
      : []),
  ]);
  return null;
}
