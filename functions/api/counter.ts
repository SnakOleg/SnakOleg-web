import { Env, json } from "./_lib";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const row = await env.DB.prepare(
    "SELECT (SELECT COALESCE(SUM(n),0) FROM agg WHERE metric='views' AND key='') views, (SELECT COALESCE(SUM(n),0) FROM agg WHERE metric='visitors') visitors",
  ).first<{ views: number; visitors: number }>();
  return json({ views: row?.views ?? 0, visitors: row?.visitors ?? 0 }, 200, {
    "Cache-Control": "public, max-age=120, s-maxage=300",
  });
};
