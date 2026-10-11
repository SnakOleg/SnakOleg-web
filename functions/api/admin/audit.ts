import { Env, json, requireAdmin } from "../_lib";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const { results } = await env.DB.prepare(
    "SELECT ts,actor,action,detail,ip,country,city FROM audit ORDER BY id DESC LIMIT 100",
  ).all();
  return json({ rows: results });
};
