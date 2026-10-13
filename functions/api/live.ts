import { hashIp } from "./_blog";
import { Env, geo, json } from "./_lib";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (request.headers.get("Upgrade") !== "websocket") return json({ error: "upgrade" }, 426);
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
