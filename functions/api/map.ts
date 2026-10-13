import { Env, json } from "./_lib";

type Row = { c: string; n: number };

// Public and cheap: visits per country for the map, postcards per country for its tooltips.
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const [visits, cards] = await Promise.all([
    env.DB.prepare(
      "SELECT key c, SUM(n) n FROM agg WHERE metric='country' AND length(key)=2 GROUP BY key ORDER BY n DESC LIMIT 250",
    ).all<Row>(),
    env.DB.prepare(
      `SELECT json_extract(card,'$.c') c, COUNT(*) n FROM comments
       WHERE post_id=0 AND card IS NOT NULL AND status IN ('visible','flagged') GROUP BY c`,
    ).all<Row>(),
  ]);
  const ok = (r: Row) => /^[A-Z]{2}$/.test(r.c ?? "") && r.c !== "XX" && r.c !== "T1";
  return json(
    {
      visits: Object.fromEntries(visits.results.filter(ok).map((r) => [r.c, r.n])),
      cards: Object.fromEntries(cards.results.filter(ok).map((r) => [r.c, r.n])),
    },
    200,
    { "Cache-Control": "public, max-age=300, s-maxage=600" },
  );
};
