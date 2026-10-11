import { Env, geo, json, limit } from "../../../_lib";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const { ip } = geo(request);
  if (!(await limit(env, `rv:${ip}`, 120, 3600))) return json({ error: "too_many" }, 429);
  const row = await env.DB.prepare("SELECT body FROM comments WHERE id=? AND status='flagged'")
    .bind(Number(params.id))
    .first<{ body: string }>();
  return row ? json({ body: row.body }) : json({ error: "not_found" }, 404);
};
