import { USER_COOKIE_DELETE, sameOriginWrite } from "../_blog";
import { Env, json } from "../_lib";

export const onRequestPost: PagesFunction<Env> = ({ request }) => {
  if (!sameOriginWrite(request)) return json({ error: "forbidden" }, 403);
  return json({ ok: true }, 200, { "Set-Cookie": USER_COOKIE_DELETE });
};
