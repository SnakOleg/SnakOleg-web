import { Env, geo, json, requireAdmin, validateContent } from "../_lib";

type Body = { key?: string; value?: unknown; base?: number; version?: number };

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const g = geo(request);
  const params = new URL(request.url).searchParams;
  const key = params.get("key") ?? "";

  const latest = async (k: string) =>
    (
      await env.DB.prepare("SELECT MAX(version) m FROM content_history WHERE key=?")
        .bind(k)
        .first<{ m: number | null }>()
    )?.m ?? 0;

  const logEntry = (action: string, detail: string) =>
    env.DB.prepare("INSERT INTO audit(ts,actor,action,detail,ip,country) VALUES(?,?,?,?,?,?)").bind(
      Date.now(),
      admin.sub,
      action,
      detail,
      g.ip,
      g.country,
    );

  const historyRow = (k: string, version: number, value: string, note: string) =>
    env.DB.prepare("INSERT INTO content_history(key,version,value,ts,actor,note) VALUES(?,?,?,?,?,?)").bind(
      k,
      version,
      value,
      Date.now(),
      admin.sub,
      note,
    );

  const trim = (k: string, version: number) =>
    env.DB.prepare("DELETE FROM content_history WHERE key=? AND version<=?").bind(k, version - 30);

  const save = async (k: string, value: unknown, version: number, action: string, note: string) => {
    const text = JSON.stringify(value);
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO content(key,value,version,updated_at) VALUES(?1,?2,?3,?4) ON CONFLICT(key) DO UPDATE SET value=?2,version=?3,updated_at=?4",
      ).bind(k, text, version, Date.now()),
      historyRow(k, version, text, note),
      trim(k, version),
      logEntry(action, `${k} v${version}`),
    ]);
    return json({ ok: true, version });
  };

  if (request.method === "GET") {
    if (!key) {
      const { results } = await env.DB.prepare("SELECT key,version,updated_at FROM content").all();
      return json({ sections: results });
    }
    const asked = Number(params.get("version"));
    if (asked) {
      const row = await env.DB.prepare("SELECT value FROM content_history WHERE key=? AND version=?")
        .bind(key, asked)
        .first<{ value: string }>();
      return row
        ? json({ version: asked, value: JSON.parse(row.value) })
        : json({ error: "Версия не найдена" }, 404);
    }
    const current = await env.DB.prepare("SELECT value FROM content WHERE key=?")
      .bind(key)
      .first<{ value: string }>();
    const history = await env.DB.prepare(
      "SELECT version,ts,actor,note FROM content_history WHERE key=? ORDER BY version DESC LIMIT 30",
    )
      .bind(key)
      .all();
    return json({
      value: current ? JSON.parse(current.value) : null,
      saved: Boolean(current),
      version: await latest(key),
      history: history.results,
    });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const k = body.key ?? key;

  if (request.method === "PUT") {
    const error = validateContent(k, body.value);
    if (error) return json({ error }, 400);
    const version = await latest(k);
    if (body.base !== version)
      return json({ error: "Раздел изменили в другом месте, перезагрузите страницу" }, 409);
    return save(k, body.value, version + 1, "content_save", "save");
  }

  if (request.method === "POST") {
    const old = await env.DB.prepare("SELECT value FROM content_history WHERE key=? AND version=?")
      .bind(k, body.version ?? 0)
      .first<{ value: string }>();
    if (!old) return json({ error: "Версия не найдена" }, 404);
    if (old.value === "null")
      return json({ error: "Это запись о сбросе, восстанавливать в ней нечего" }, 400);
    return save(
      k,
      JSON.parse(old.value),
      (await latest(k)) + 1,
      "content_restore",
      `restore:${body.version}`,
    );
  }

  if (request.method === "DELETE") {
    const version = (await latest(k)) + 1;
    await env.DB.batch([
      env.DB.prepare("DELETE FROM content WHERE key=?").bind(k),
      historyRow(k, version, "null", "reset"),
      trim(k, version),
      logEntry("content_reset", `${k} v${version}`),
    ]);
    return json({ ok: true, version });
  }

  return json({ error: "method not allowed" }, 405);
};
