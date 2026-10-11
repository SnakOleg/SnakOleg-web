import { safeReturn } from "../_blog";
import { Env, deniedPage, geo, isBlocked, limit, rnd, setCookie, sha256, sign } from "../_lib";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { ip } = geo(request);
  if (await isBlocked(env, ip)) {
    return deniedPage(
      "Ваш адрес заблокирован владельцем сайта.",
      "Your address has been blocked by the site owner.",
    );
  }
  if (!(await limit(env, `login:${ip}`, 20, 600)))
    return deniedPage(
      "Слишком много попыток входа. Подождите несколько минут.",
      "Too many attempts. Please wait a few minutes.",
      429,
    );

  const origin = new URL(request.url).origin;
  const state = rnd(16);
  const nonce = rnd(16);
  const verifier = rnd(32);

  const auth = new URL("https://oauth.telegram.org/auth");
  auth.search = new URLSearchParams({
    client_id: env.TG_CLIENT_ID,
    redirect_uri: `${origin}/api/auth/callback`,
    response_type: "code",
    scope: "openid profile",
    state,
    nonce,
    code_challenge: await sha256(verifier),
    code_challenge_method: "S256",
  }).toString();

  const params = new URL(request.url).searchParams;
  const mode = params.get("mode") === "user" ? "user" : "admin";
  const tmp = await sign(
    { state, nonce, verifier, mode, ret: mode === "user" ? safeReturn(params.get("return")) : "" },
    env.SESSION_SECRET,
    600,
  );
  return new Response(null, {
    status: 302,
    headers: {
      Location: auth.toString(),
      "Set-Cookie": setCookie("oauth_tmp", tmp, 600, { path: "/api/auth", sameSite: "Lax" }),
      "Cache-Control": "no-store",
    },
  });
};
