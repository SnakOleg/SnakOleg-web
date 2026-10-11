import { deletePost, savePost } from "../_posts";
import type { PostInput } from "../_posts";
import { Env, audit, json, requireAdmin } from "../_lib";

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  if (request.method === "GET") {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (id) {
      const post = await env.DB.prepare("SELECT * FROM posts WHERE id=?").bind(id).first<{ tags: string }>();
      return post
        ? json({ post: { ...post, tags: JSON.parse(post.tags) } })
        : json({ error: "Пост не найден" }, 404);
    }
    const { results } = await env.DB.prepare(
      `SELECT id,title,status,pinned,pub,updated,views,comments_open,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id=posts.id AND c.status IN ('visible','flagged','pending')) comments
       FROM posts ORDER BY pub DESC LIMIT 300`,
    ).all();
    return json({ posts: results, now: Date.now() });
  }
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);

  const b = (await request.json().catch(() => ({}))) as PostInput & { action?: string };
  if (b.action === "delete") {
    await deletePost(env, Number(b.id));
    await audit(env, request, admin.sub, "post_delete", String(Number(b.id)));
    return json({ ok: true });
  }
  const r = await savePost(env, b);
  if ("response" in r) return r.response;
  await audit(
    env,
    request,
    admin.sub,
    r.created ? "post_create" : "post_update",
    `${r.id} ${r.title}`.slice(0, 80),
  );
  return json({ ok: true, id: r.id }, r.created ? 201 : 200);
};
