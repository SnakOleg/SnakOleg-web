import { Env, json, requireAdmin } from "../_lib";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "bad date" }, 400);

  const { results } = await env.DB.prepare("SELECT metric,key,n FROM agg WHERE day=?")
    .bind(date)
    .all<{ metric: string; key: string; n: number }>();

  const hours = Array<number>(24).fill(0);
  const lists: Record<string, [string, number][]> = {};
  let views = 0;
  let visitors = 0;
  for (const r of results) {
    if (r.metric === "views") views += r.n;
    else if (r.metric === "visitors") visitors += r.n;
    else if (r.metric === "hour") hours[Number(r.key)] = r.n;
    else (lists[r.metric] ??= []).push([r.key, r.n]);
  }
  for (const m of Object.keys(lists)) lists[m] = lists[m].sort((a, b) => b[1] - a[1]).slice(0, 8);
  return json({ date, views, visitors, hours, top: lists });
};
