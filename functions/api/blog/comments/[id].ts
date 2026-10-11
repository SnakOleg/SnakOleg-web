import { COMMENT_MAX, EDIT_WINDOW_MS, cleanText } from "../../../../shared/blog";
import { isSpam, scoreComment } from "../../../../shared/spam";
import { activeBan, banBody, requireUser } from "../../_blog";
import { Env, json, limit } from "../../_lib";
import { closeThread } from "../_shared";

type Own = { id: number; user_id: string; status: string; created: number };
const find = (env: Env, id: unknown) =>
  env.DB.prepare("SELECT id,user_id,status,created FROM comments WHERE id=?").bind(Number(id)).first<Own>();

// Edit your own comment for 15 minutes; the text is scored again, so editing cannot launder spam.
export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const u = await requireUser(request, env);
  if (u instanceof Response) return u;
  const ban = await activeBan(env, u.id, "blog");
  if (ban) return json(banBody(ban), 403);
  const c = await find(env, params.id);
  if (!c || c.user_id !== u.id || c.status === "deleted" || c.status === "hidden")
    return json({ error: "not_found" }, 404);
  if (Date.now() - c.created > EDIT_WINDOW_MS) return json({ error: "too_late" }, 403);
  if (!(await limit(env, `ce:${u.id}`, 10, 3600))) return json({ error: "too_many" }, 429);

  const body = (await request.json().catch(() => null)) as { body?: unknown } | null;
  const text = cleanText(body?.body, COMMENT_MAX + 1);
  if (!text || text.length > COMMENT_MAX) return json({ error: "invalid" }, 400);
  const verdict = u.owner ? { score: 0, flags: [] } : scoreComment(text, { newUser: true });
  const status = isSpam(verdict)
    ? "flagged"
    : c.status === "flagged" || c.status === "pending"
      ? c.status
      : "visible";
  await env.DB.prepare("UPDATE comments SET body=?, status=?, flags=?, edited=? WHERE id=?")
    .bind(text, status, JSON.stringify(verdict.flags), Date.now(), c.id)
    .run();
  return json({ ok: true, status, body: status === "flagged" ? "" : text });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const u = await requireUser(request, env);
  if (u instanceof Response) return u;
  const c = await find(env, params.id);
  if (!c || (c.user_id !== u.id && !u.owner)) return json({ error: "not_found" }, 404);
  await closeThread(env, c.id, "deleted");
  return json({ ok: true });
};
