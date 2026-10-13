import { hashIp } from "./_blog";
import { Env, geo, json } from "./_lib";

// A plain GET tells the page whether the realtime Worker answers, so it never opens a socket that is bound to fail.
async function probe(env: Env) {
  if (!env.LIVE) return false;
  try {
    const res = await env.LIVE.get(env.LIVE.idFromName("site")).fetch("https://live/");
    return res.status === 426;
  } catch {
    return false;
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (request.headers.get("Upgrade") !== "websocket")
    return json({ live: await probe(env) }, 200, { "Cache-Control": "no-store" });
  if (!env.LIVE) return json({ error: "off" }, 503);
  const url = new URL(request.url);
  if (request.headers.get("Origin") !== url.origin) return json({ error: "forbidden" }, 403);

  const { ip } = geo(request);
  const to = new URL("https://live/");
  to.searchParams.set("page", url.searchParams.get("page") ?? "/");
  to.searchParams.set("cursors", url.searchParams.get("cursors") === "0" ? "0" : "1");
  const stub = env.LIVE.get(env.LIVE.idFromName("site"));
  return stub.fetch(new Request(to, { headers: { Upgrade: "websocket", "x-ip": await hashIp(env, ip) } }));
};
