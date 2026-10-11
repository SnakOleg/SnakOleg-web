import { getUser, requireUser } from "../_blog";
import { MAX_PINNED, deletePost, savePost } from "../_posts";
import type { PostInput } from "../_posts";
import { Env, audit, json, limit } from "../_lib";

type Body = PostInput & { action?: string; on?: boolean };

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (u instanceof Response) return u;
  if (!u.owner) return json({ error: "forbidden" }, 403);
  if (!(await limit(env, `compose:${u.id}`, 60, 3600))) return json({ error: "too_many" }, 429);
  const b = (await request.json().catch(() => ({}))) as Body;

  if (b.action === "delete") {
    await deletePost(env, Number(b.id));
    await audit(env, request, u.id, "post_delete", String(Number(b.id)));
    return json({ ok: true });
  }
  if (b.action === "pin") {
    const id = Number(b.id);
    if (b.on) {
      const n = await env.DB.prepare("SELECT COUNT(*) n FROM posts WHERE pinned=1 AND id!=?")
        .bind(id)
        .first<{ n: number }>();
      if ((n?.n ?? 0) >= MAX_PINNED)
        return json({ error: `Закрепить можно не больше ${MAX_PINNED} постов.` }, 409);
    }
    await env.DB.prepare("UPDATE posts SET pinned=? WHERE id=?")
      .bind(b.on ? 1 : 0, id)
      .run();
    return json({ ok: true });
  }
  const r = await savePost(env, b);
  if ("response" in r) return r.response;
  await audit(
    env,
    request,
    u.id,
    r.created ? "post_create" : "post_update",
    `${r.id} ${r.title}`.slice(0, 80),
  );
  return json({ ok: true, id: r.id }, r.created ? 201 : 200);
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const u = await getUser(request, env);
  if (!u?.owner) return json({ error: "forbidden" }, 403);
  const id = Number(new URL(request.url).searchParams.get("id"));
  const p = await env.DB.prepare("SELECT * FROM posts WHERE id=?").bind(id).first<{ tags: string }>();
  return p ? json({ post: { ...p, tags: JSON.parse(p.tags) } }) : json({ error: "not_found" }, 404);
};
