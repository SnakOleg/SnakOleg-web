import { cleanLine } from "../../shared/blog";
import { normalize, validatePalette } from "../../shared/palette";
import { activeBan, banBody, getSettings, requireUser } from "./_blog";
import { Env, geo, json, limit, sha256 } from "./_lib";

const BOT = /bot|crawl|spider|slurp|headless|preview|lighthouse|monitor/i;
const LIMIT = { pending: 100, total: 300, perHour: 5 };

type Row = { id: number; name: string; author: string; comment: string; palette: string };

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    "SELECT id,name,author,comment,palette FROM presets WHERE status='approved' ORDER BY id DESC LIMIT 60",
  ).all<Row>();
  const presets = results.map((r) => ({ ...r, palette: JSON.parse(r.palette) }));
  return json({ presets }, 200, { "Cache-Control": "public, max-age=60, s-maxage=300" });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ua = request.headers.get("User-Agent") ?? "";
  if (!ua || BOT.test(ua)) return json({ error: "forbidden" }, 403);
  // Suggesting a theme needs a Telegram sign-in, so abuse can be traced to an account and blocked.
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;
  const ban = await activeBan(env, user.id, "themes");
  if (ban) return json(banBody(ban), 403);
  const settings = await getSettings(env);
  if (!settings.themesOpen) return json({ error: "closed" }, 403);

  const theme = await env.DB.prepare("SELECT value FROM content WHERE key='theme'").first<{
    value: string;
  }>();
  if (theme && JSON.parse(theme.value).presets === false) return json({ error: "closed" }, 403);

  const { ip } = geo(request);
  if (!(await limit(env, `preset:${ip}`, LIMIT.perHour, 3600))) return json({ error: "too_many" }, 429);
  if (!user.owner && !(await limit(env, `presetu:${user.id}`, settings.themesPerDay, 86400)))
    return json({ error: "too_many" }, 429);

  const text = await request.text();
  if (text.length > 1500) return json({ error: "too_large" }, 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "invalid" }, 400);
  }

  const palette = normalize(body.palette);
  const name = cleanLine(body.name, 30);
  if (!palette || validatePalette(palette) || name.length < 2) return json({ error: "invalid" }, 400);
  const stored = JSON.stringify(palette);

  const counts = await env.DB.prepare("SELECT status, COUNT(*) n FROM presets GROUP BY status").all<{
    status: string;
    n: number;
  }>();
  const by = Object.fromEntries(counts.results.map((c) => [c.status, c.n]));
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  if ((by.pending ?? 0) >= LIMIT.pending || total >= LIMIT.total) return json({ error: "full" }, 429);

  const twin = await env.DB.prepare(
    "SELECT 1 FROM presets WHERE palette=? AND status IN ('pending','approved')",
  )
    .bind(stored)
    .first();
  if (twin) return json({ error: "duplicate" }, 409);

  const author = cleanLine(body.author, 30) || cleanLine(user.name, 30) || "Аноним";
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM presets WHERE status='rejected' AND created < ?").bind(now - 7 * 864e5),
    env.DB.prepare(
      "INSERT INTO presets(name,author,comment,palette,status,created,ip_hash,user_id) VALUES (?,?,?,?,?,?,?,?)",
    ).bind(
      name,
      author,
      cleanLine(body.comment, 140),
      stored,
      "pending",
      now,
      (await sha256(`${env.SESSION_SECRET}|${ip}`)).slice(0, 16),
      user.id,
    ),
  ]);
  return json({ ok: true }, 201);
};
