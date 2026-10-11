import { Env, json, localDay, requireAdmin, shiftDay } from "../_lib";

type Row = { day: string; metric: string; key: string; n: number };

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const params = new URL(request.url).searchParams;
  const days = Math.min(365, Math.max(1, Number(params.get("days")) || 30));
  const today = localDay(env);
  const from = shiftDay(today, -(days - 1));

  const { results } = await env.DB.prepare("SELECT day,metric,key,n FROM agg WHERE day>=?")
    .bind(from)
    .all<Row>();

  const series = Array.from({ length: days }, (_, i) => ({
    day: shiftDay(from, i),
    views: 0,
    visitors: 0,
  }));
  const index = new Map(series.map((s, i) => [s.day, i]));
  const lists: Record<string, Map<string, number>> = {};
  let clicks = 0;

  for (const r of results) {
    const i = index.get(r.day);
    if (r.metric === "views" && i !== undefined) series[i].views += r.n;
    else if (r.metric === "visitors" && i !== undefined) series[i].visitors += r.n;
    else if (params.get("only") === "series" || r.metric === "hour") continue;
    else {
      const map = (lists[r.metric] ??= new Map());
      map.set(r.key, (map.get(r.key) ?? 0) + r.n);
      if (r.metric === "click") clicks += r.n;
    }
  }

  const top = Object.fromEntries(
    Object.entries(lists).map(([metric, map]) => [
      metric,
      [...map].sort((a, b) => b[1] - a[1]).slice(0, 100),
    ]),
  );
  return json({ days, today, series, top, clicks });
};
