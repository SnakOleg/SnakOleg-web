import { EGGS, isCountryStamp, isSeasonStamp, seasonStamp } from "../../shared/stamps";
import { getUser, requireUser } from "./_blog";
import { Env, geo, json, limit } from "./_lib";
import { award } from "./_stamps";

const DAY = 86_400_000;

const seasonOk = (code: string) => {
  const now = Date.now();
  return [now - DAY, now, now + DAY].some((t) => seasonStamp(new Date(t)) === code);
};

// Reading the passport also stamps the country the visitor is in right now.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const u = await getUser(request, env);
  if (!u) return json({ stamps: [] });
  const country = `c:${geo(request).country}`;
  if (isCountryStamp(country)) await award(env, u.id, [country]);
  const { results } = await env.DB.prepare("SELECT code,created FROM stamps WHERE user_id=? ORDER BY created")
    .bind(u.id)
    .all<{ code: string; created: number }>();
  return json({ stamps: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (u instanceof Response) return u;
  if (!(await limit(env, `st:${u.id}`, 30, 3600))) return json({ error: "too_many" }, 429);
  const body = (await request.json().catch(() => null)) as { codes?: unknown } | null;
  const list = Array.isArray(body?.codes) ? body.codes.slice(0, 40) : [];
  const codes = [...new Set(list.filter((c): c is string => typeof c === "string"))].filter(
    (c) => EGGS.has(c) || (isSeasonStamp(c) && seasonOk(c)),
  );
  await award(env, u.id, codes);
  return json({ ok: true, added: codes });
};
