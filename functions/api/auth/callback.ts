import { USER_COOKIE, USER_TTL, safePicture, safeReturn } from "../_blog";
import {
  Env,
  SESSION,
  audit,
  deniedPage,
  fingerprint,
  geo,
  getCookie,
  isAdmin,
  isBlocked,
  limit,
  notify,
  parseUA,
  rnd,
  setCookie,
  sign,
  verify,
  verifyIdToken,
} from "../_lib";

const plain = (s: string) => s.replace(/[<>&"']/g, "");

export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const url = new URL(request.url);
  const g = geo(request);
  if (await isBlocked(env, g.ip)) {
    return deniedPage(
      "Ваш адрес заблокирован владельцем сайта.",
      "Your address has been blocked by the site owner.",
    );
  }
  if (!(await limit(env, `cb:${g.ip}`, 20, 600)))
    return deniedPage(
      "Слишком много попыток входа. Подождите несколько минут.",
      "Too many attempts. Please wait a few minutes.",
      429,
    );

  const failure = url.searchParams.get("error");
  if (failure) {
    return deniedPage(
      `Telegram не завершил вход: ${plain(failure)}.`,
      "Telegram did not complete the sign in.",
      400,
    );
  }

  const tmp = await verify<{ state: string; nonce: string; verifier: string; mode?: string; ret?: string }>(
    getCookie(request, "oauth_tmp"),
    env.SESSION_SECRET,
  );
  const code = url.searchParams.get("code");
  if (!tmp || !code || tmp.state !== url.searchParams.get("state")) {
    return deniedPage(
      "Сессия входа устарела. Попробуйте ещё раз.",
      "The login session expired. Try again.",
      400,
    );
  }

  const res = await fetch("https://oauth.telegram.org/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${env.TG_CLIENT_ID}:${env.TG_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${url.origin}/api/auth/callback`,
      client_id: env.TG_CLIENT_ID,
      code_verifier: tmp.verifier,
    }),
  });
  const { id_token } = (await res.json().catch(() => ({}))) as { id_token?: string };
  const claims = id_token ? await verifyIdToken(id_token, env.TG_CLIENT_ID) : null;
  if (!claims || (claims.nonce && claims.nonce !== tmp.nonce)) {
    return deniedPage("Не удалось проверить ответ Telegram.", "Telegram login could not be verified.");
  }

  const id = String(claims.id ?? claims.sub);

  // Visitors signing in to comment: a plain account, no admin rights, a separate 30-day cookie.
  if (tmp.mode === "user") {
    const now = Date.now();
    const name = String(claims.name ?? claims.preferred_username ?? "user")
      .replace(/[<>]/g, "")
      .slice(0, 60);
    const username = String(claims.preferred_username ?? "")
      .replace(/[^\w]/g, "")
      .slice(0, 40);
    await env.DB.prepare(
      "INSERT INTO users(id,name,username,picture,created,seen) VALUES (?1,?2,?3,?4,?5,?5) ON CONFLICT(id) DO UPDATE SET name=?2, username=?3, picture=?4, seen=?5",
    )
      .bind(id, name, username, safePicture(claims.picture), now)
      .run();
    const headers = new Headers({ Location: safeReturn(tmp.ret ?? null), "Cache-Control": "no-store" });
    headers.append(
      "Set-Cookie",
      setCookie(USER_COOKIE, await sign({ t: "u", sub: id }, env.SESSION_SECRET, USER_TTL), USER_TTL, {
        sameSite: "Lax",
      }),
    );
    headers.append("Set-Cookie", setCookie("oauth_tmp", "", 0, { path: "/api/auth", sameSite: "Lax" }));
    return new Response(null, { status: 302, headers });
  }

  if (!isAdmin(env, id)) {
    await audit(env, request, id, "login_denied");
    if (await limit(env, "notify:denied", 3, 3600)) {
      waitUntil(
        notify(
          env,
          `Попытка входа в админку с чужого аккаунта Telegram (id ${id}).\nIP: ${g.ip}, ${g.city} ${g.country}`,
        ),
      );
    }
    return deniedPage(
      `Этот аккаунт Telegram (id ${plain(id)}) не входит в список владельцев. Если это вы, впишите id в ADMIN_TG_ID.`,
      "This Telegram account is not on the admin list.",
    );
  }

  const earlier = await env.DB.prepare(
    "SELECT fp, country FROM sessions WHERE tg_id=? ORDER BY created DESC LIMIT 50",
  )
    .bind(id)
    .all<{ fp: string; country: string }>();
  const print = fingerprint(g.ua);
  const unfamiliar =
    earlier.results.length > 0 &&
    (!earlier.results.some((r) => r.fp === print) || !earlier.results.some((r) => r.country === g.country));

  const now = Date.now();
  const sid = rnd(16);
  const name = String(claims.name ?? claims.preferred_username ?? "admin").slice(0, 60);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE created < ?").bind(now - 30 * 864e5),
    env.DB.prepare(
      "INSERT INTO sessions(id,tg_id,name,created,seen,ip,last_ip,country,last_country,city,org,ua,fp) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
    ).bind(sid, id, name, now, now, g.ip, g.ip, g.country, g.country, g.city, g.org, g.ua, fingerprint(g.ua)),
  ]);
  await audit(env, request, id, "login");
  if (unfamiliar) {
    const p = parseUA(g.ua);
    waitUntil(
      notify(
        env,
        `Вход в админку с нового устройства или из новой страны.\n${p.browser} на ${p.os}\n${g.city} ${g.country}, IP ${g.ip}\nЕсли это не вы, откройте «Безопасность» и завершите сессию.`,
      ),
    );
  }

  const headers = new Headers({ Location: "/admin", "Cache-Control": "no-store" });
  headers.append(
    "Set-Cookie",
    setCookie(SESSION, await sign({ sid, sub: id, name }, env.SESSION_SECRET, 8 * 3600), 8 * 3600),
  );
  headers.append("Set-Cookie", setCookie("oauth_tmp", "", 0, { path: "/api/auth", sameSite: "Lax" }));
  return new Response(null, { status: 302, headers });
};
