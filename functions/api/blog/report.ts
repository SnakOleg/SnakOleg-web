import { REPORTS_TO_FLAG } from "../../../shared/blog";
import { activeBan, banBody, requireUser } from "../_blog";
import { Env, json, limit, localDay, notify } from "../_lib";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const u = await requireUser(request, env);
  if (u instanceof Response) return u;
  const ban = await activeBan(env, u.id, "blog");
  if (ban) return json(banBody(ban), 403);
  if (!(await limit(env, `rp:${u.id}:${localDay(env)}`, 20, 86400))) return json({ error: "too_many" }, 429);

  const b = (await request.json().catch(() => null)) as { comment?: unknown; reason?: unknown } | null;
  const id = Number(b?.comment);
  const c = Number.isInteger(id)
    ? await env.DB.prepare(
        "SELECT id,user_id,status,flags FROM comments WHERE id=? AND status IN ('visible','flagged')",
      )
        .bind(id)
        .first<{ id: number; user_id: string; status: string; flags: string }>()
    : null;
  if (!c || c.user_id === u.id) return json({ error: "invalid" }, 400);

  const added = await env.DB.prepare(
    "INSERT OR IGNORE INTO reports(comment_id,user_id,reason,created) VALUES (?,?,?,?)",
  )
    .bind(
      id,
      u.id,
      String(b?.reason ?? "")
        .replace(/[<>]/g, "")
        .slice(0, 120),
      Date.now(),
    )
    .run();
  if (!added.meta.changes) return json({ ok: true, duplicate: true });

  const n = await env.DB.prepare("SELECT COUNT(*) n FROM reports WHERE comment_id=?")
    .bind(id)
    .first<{ n: number }>();
  const total = n?.n ?? 1;
  await env.DB.prepare("UPDATE comments SET reports=? WHERE id=?").bind(total, id).run();
  if (total >= REPORTS_TO_FLAG && c.status === "visible") {
    const flags = [...new Set([...(JSON.parse(c.flags) as string[]), "reports"])];
    await env.DB.prepare("UPDATE comments SET status='flagged', flags=? WHERE id=?")
      .bind(JSON.stringify(flags), id)
      .run();
    if (await limit(env, "notify:report", 6, 3600))
      waitUntil(notify(env, `⚠ Комментарий #${id} скрыт после ${total} жалоб.`));
  }
  return json({ ok: true });
};
