import { getUser } from "../../_blog";
import { Env, json } from "../../_lib";
import { reactionsFor } from "../_shared";

type Row = {
  id: number;
  title: string;
  body: string;
  tags: string;
  cover: string;
  pinned: number;
  pub: number;
  views: number;
  comments_open: number;
};
const brief = "SELECT id,title FROM posts WHERE status='published' AND pub<=?1";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = Number(params.id);
  const now = Date.now();
  const post = Number.isInteger(id)
    ? await env.DB.prepare(
        "SELECT id,title,body,tags,cover,pinned,pub,views,comments_open FROM posts WHERE id=?1 AND status='published' AND pub<=?2",
      )
        .bind(id, now)
        .first<Row>()
    : null;
  if (!post) return json({ error: "not_found" }, 404);

  const me = await getUser(request, env);
  const [{ counts, mine }, prev, next, cc] = await Promise.all([
    reactionsFor(env, "post", [id], me?.id ?? null),
    env.DB.prepare(`${brief} AND pub<?2 ORDER BY pub DESC LIMIT 1`).bind(now, post.pub).first(),
    env.DB.prepare(`${brief} AND pub>?2 ORDER BY pub ASC LIMIT 1`).bind(now, post.pub).first(),
    env.DB.prepare("SELECT COUNT(*) n FROM comments WHERE post_id=? AND status IN ('visible','flagged')")
      .bind(id)
      .first<{ n: number }>(),
  ]);
  return json({
    post: {
      id: post.id,
      title: post.title,
      body: post.body,
      tags: JSON.parse(post.tags),
      cover: post.cover,
      pinned: !!post.pinned,
      pub: post.pub,
      views: post.views,
      commentsOpen: !!post.comments_open,
      comments: cc?.n ?? 0,
      reactions: counts.get(id) ?? {},
      mine: mine.get(id) ?? [],
    },
    prev,
    next,
  });
};
