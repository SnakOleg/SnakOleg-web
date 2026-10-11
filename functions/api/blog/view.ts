import { Env, geo, json, limit, localDay, sha256 } from "../_lib";

const BOT = /bot|crawl|spider|slurp|headless|preview|lighthouse|monitor/i;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const g = geo(request);
  if (request.headers.get("Origin") !== new URL(request.url).origin || !g.ua || BOT.test(g.ua))
    return json({ ok: true });
  const b = (await request.json().catch(() => null)) as { post?: unknown } | null;
  const id = Number(b?.post);
  if (!Number.isInteger(id) || !(await limit(env, `vw:${g.ip}`, 150, 86400))) return json({ ok: true });
  const vid = (await sha256(`${env.SESSION_SECRET}|${g.ip}|${g.ua}`)).slice(0, 16);
  const exists = await env.DB.prepare("SELECT 1 FROM posts WHERE id=? AND status='published'")
    .bind(id)
    .first();
  if (!exists) return json({ ok: true });
  const ins = await env.DB.prepare("INSERT OR IGNORE INTO viewed(day,vid,post_id) VALUES (?,?,?)")
    .bind(localDay(env), vid, id)
    .run();
  if (ins.meta.changes)
    await env.DB.prepare("UPDATE posts SET views=views+1 WHERE id=? AND status='published'").bind(id).run();
  return json({ ok: true });
};
