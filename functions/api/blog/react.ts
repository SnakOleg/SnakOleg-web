import { MAX_REACTIONS_PER_TARGET } from "../../../shared/blog";
import { activeBan, banBody, getUser, publicUser, requireUser } from "../_blog";
import { Env, json, limit } from "../_lib";
import { isEmoji, reactionsFor } from "./_shared";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const u = await getUser(request, env);
  if (!u?.owner) return json({ error: "forbidden" }, 403);
  const target = Number(new URL(request.url).searchParams.get("post"));
  if (!Number.isInteger(target)) return json({ error: "invalid" }, 400);
  const { results } = await env.DB.prepare(
    `SELECT r.user_id,r.emoji,r.created,u.name,u.username,u.picture
     FROM reactions r LEFT JOIN users u ON u.id=r.user_id
     WHERE r.kind='post' AND r.target=? ORDER BY r.created DESC LIMIT 200`,
  )
    .bind(target)
    .all<{
      user_id: string;
      emoji: string;
      created: number;
      name: string | null;
      username: string | null;
      picture: string | null;
    }>();
  return json({
    people: results.map((r) => ({
      user: publicUser(
        { id: r.user_id, name: r.name ?? "Удалён", username: r.username ?? "", picture: r.picture ?? "" },
        env,
      ),
      emoji: r.emoji,
      created: r.created,
    })),
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (u instanceof Response) return u;
  const ban = await activeBan(env, u.id, "blog");
  if (ban) return json(banBody(ban), 403);
  if (!(await limit(env, `rx:${u.id}`, 90, 3600))) return json({ error: "too_many" }, 429);

  const b = (await request.json().catch(() => null)) as {
    kind?: string;
    target?: unknown;
    emoji?: unknown;
  } | null;
  const target = Number(b?.target);
  const kind = b?.kind === "comment" ? "comment" : b?.kind === "post" ? "post" : null;
  if (!kind || !Number.isInteger(target) || !isEmoji(b?.emoji)) return json({ error: "invalid" }, 400);

  const exists =
    kind === "post"
      ? await env.DB.prepare("SELECT 1 FROM posts WHERE id=? AND status='published' AND pub<=?")
          .bind(target, Date.now())
          .first()
      : await env.DB.prepare("SELECT 1 FROM comments WHERE id=? AND status IN ('visible','flagged')")
          .bind(target)
          .first();
  if (!exists) return json({ error: "not_found" }, 404);

  const had = await env.DB.prepare(
    "SELECT 1 FROM reactions WHERE kind=? AND target=? AND user_id=? AND emoji=?",
  )
    .bind(kind, target, u.id, b!.emoji)
    .first();
  if (had) {
    await env.DB.prepare("DELETE FROM reactions WHERE kind=? AND target=? AND user_id=? AND emoji=?")
      .bind(kind, target, u.id, b!.emoji)
      .run();
  } else {
    const n = await env.DB.prepare("SELECT COUNT(*) n FROM reactions WHERE kind=? AND target=? AND user_id=?")
      .bind(kind, target, u.id)
      .first<{ n: number }>();
    if ((n?.n ?? 0) >= MAX_REACTIONS_PER_TARGET) return json({ error: "max_reactions" }, 409);
    await env.DB.prepare("INSERT INTO reactions(kind,target,user_id,emoji,created) VALUES (?,?,?,?,?)")
      .bind(kind, target, u.id, b!.emoji, Date.now())
      .run();
  }
  const { counts, mine } = await reactionsFor(env, kind, [target], u.id);
  return json({ reactions: counts.get(target) ?? {}, mine: mine.get(target) ?? [] });
};
