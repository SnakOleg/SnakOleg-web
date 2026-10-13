import type { Env } from "../api/_lib";

type Assets = Env & { ASSETS: Fetcher };

const PAGES = new Set(["word", "reaction", "garden", "capsule"]);

// Every game is its own address but the same page: the shell reads the path and shows the right game.
export const onRequestGet: PagesFunction<Assets> = async ({ request, env, params }) => {
  const url = new URL(request.url);
  const seg = ([] as string[]).concat(params.path ?? []);
  let res = await env.ASSETS.fetch(new Request(new URL("/games", url), { redirect: "manual" }));
  if (res.status >= 300 && res.status < 400) {
    const to = res.headers.get("Location");
    if (to) res = await env.ASSETS.fetch(new Request(new URL(to, url)));
  }
  if (seg.length === 0 || (seg.length === 1 && PAGES.has(seg[0]!))) return res;
  return new Response(res.body, { status: 404, headers: res.headers });
};
