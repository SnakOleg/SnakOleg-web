import { Env, json } from "./_lib";
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare("SELECT key,value FROM content").all<{
    key: string;
    value: string;
  }>();
  return json(Object.fromEntries(results.map((r) => [r.key, JSON.parse(r.value)])), 200, {
    "Cache-Control": "public, max-age=30, s-maxage=60",
  });
};
