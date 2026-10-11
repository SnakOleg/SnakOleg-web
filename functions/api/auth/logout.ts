import { Env, SESSION, getCookie, json, setCookie, verify } from "../_lib";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (request.headers.get("Origin") !== new URL(request.url).origin) return json({ error: "forbidden" }, 403);
  const s = await verify<{ sid: string }>(getCookie(request, SESSION), env.SESSION_SECRET);
  if (s?.sid) await env.DB.prepare("UPDATE sessions SET revoked=1 WHERE id=?").bind(s.sid).run();
  return json({ ok: true }, 200, { "Set-Cookie": setCookie(SESSION, "", 0) });
};
