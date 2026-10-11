import { Env, SESSION, audit, geo, json, requireAdmin, setCookie } from "../_lib";

type Body = { action?: string; id?: string; ip?: string; reason?: string };

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireAdmin(request, env);
  if (me instanceof Response) return me;

  if (request.method === "GET") {
    const sessions = await env.DB.prepare(
      "SELECT id,name,created,seen,ip,last_ip,country,last_country,city,org,ua,revoked FROM sessions ORDER BY created DESC LIMIT 40",
    ).all();
    const attempts = await env.DB.prepare(
      "SELECT ts,actor,ip,ua,country,city FROM audit WHERE action='login_denied' ORDER BY id DESC LIMIT 30",
    ).all();
    const blocked = await env.DB.prepare("SELECT ip,ts,reason FROM blocked ORDER BY ts DESC").all();
    return json({
      me: me.sid,
      sessions: sessions.results,
      attempts: attempts.results,
      blocked: blocked.results,
    });
  }

  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  const body = (await request.json().catch(() => ({}))) as Body;
  let clear = false;
  let count = 0;

  switch (body.action) {
    case "revoke": {
      if (!body.id) return json({ error: "Не указана сессия" }, 400);
      await env.DB.prepare("UPDATE sessions SET revoked=1 WHERE id=?").bind(body.id).run();
      clear = body.id === me.sid;
      await audit(env, request, me.sub, "session_revoked", body.id.slice(0, 6));
      break;
    }
    case "revoke_others": {
      const result = await env.DB.prepare("UPDATE sessions SET revoked=1 WHERE id<>? AND revoked=0")
        .bind(me.sid)
        .run();
      count = result.meta.changes;
      await audit(env, request, me.sub, "sessions_revoked_others", String(count));
      break;
    }
    case "revoke_all": {
      const result = await env.DB.prepare("UPDATE sessions SET revoked=1 WHERE revoked=0").run();
      count = result.meta.changes;
      clear = true;
      await audit(env, request, me.sub, "sessions_revoked_all", String(count));
      break;
    }
    case "block": {
      const ip = (body.ip ?? "").slice(0, 64);
      if (!ip) return json({ error: "Не указан адрес" }, 400);
      if (ip === geo(request).ip) {
        return json({ error: "Это ваш текущий адрес, блокировка закрыла бы вам доступ" }, 400);
      }
      await env.DB.batch([
        env.DB.prepare("INSERT OR REPLACE INTO blocked(ip,ts,reason) VALUES (?,?,?)").bind(
          ip,
          Date.now(),
          (body.reason ?? "").slice(0, 120),
        ),
        env.DB.prepare("UPDATE sessions SET revoked=1 WHERE ip=?1 OR last_ip=?1").bind(ip),
      ]);
      await audit(env, request, me.sub, "ip_blocked", ip);
      break;
    }
    case "unblock": {
      await env.DB.prepare("DELETE FROM blocked WHERE ip=?")
        .bind(body.ip ?? "")
        .run();
      await audit(env, request, me.sub, "ip_unblocked", body.ip ?? "");
      break;
    }
    default:
      return json({ error: "unknown action" }, 400);
  }
  return json({ ok: true, count }, 200, clear ? { "Set-Cookie": setCookie(SESSION, "", 0) } : {});
};
