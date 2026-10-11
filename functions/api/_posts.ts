import { cleanText, excerptOf } from "../../shared/blog";
import { Env, json } from "./_lib";

const TAG = /^[\p{L}\p{N}_-]{1,24}$/u;
const COVER = /^(https:\/\/|\/(?!\/))\S{1,500}$/;
export const MAX_PINNED = 3;

export type PostInput = {
  id?: number;
  title?: unknown;
  body?: unknown;
  tags?: unknown;
  cover?: unknown;
  pinned?: unknown;
  status?: unknown;
  publishAt?: unknown;
  commentsOpen?: unknown;
};

export async function savePost(
  env: Env,
  b: PostInput,
): Promise<{ response: Response } | { id: number; created: boolean; title: string }> {
  const fail = (error: string, status = 400) => ({ response: json({ error }, status) });
  const title = cleanText(b.title, 120).replace(/\n/g, " ");
  const body = cleanText(b.body, 30_000);
  if (!title) return fail("Нужен заголовок");
  const tags = [
    ...new Set(
      (Array.isArray(b.tags) ? b.tags : [])
        .map((t) => String(t).trim().replace(/^#/, "").toLowerCase())
        .filter((t) => TAG.test(t)),
    ),
  ].slice(0, 8);
  const cover = String(b.cover ?? "").trim();
  if (cover && !COVER.test(cover)) return fail("Обложка: нужна ссылка https://…");
  const status = b.status === "published" ? "published" : "draft";
  const now = Date.now();
  const at = typeof b.publishAt === "number" && b.publishAt > 0 ? Math.floor(b.publishAt) : null;
  const id = Number(b.id) || 0;

  if (b.pinned) {
    const n = await env.DB.prepare("SELECT COUNT(*) n FROM posts WHERE pinned=1 AND id!=?")
      .bind(id)
      .first<{ n: number }>();
    if ((n?.n ?? 0) >= MAX_PINNED)
      return fail(`Закрепить можно не больше ${MAX_PINNED} постов. Открепите один из них.`, 409);
  }
  const flags = [b.pinned ? 1 : 0, b.commentsOpen === false ? 0 : 1];

  if (id) {
    const old = await env.DB.prepare("SELECT pub,status FROM posts WHERE id=?")
      .bind(id)
      .first<{ pub: number; status: string }>();
    if (!old) return fail("Пост не найден", 404);
    const pub = at ?? (status === "published" && old.status !== "published" ? now : old.pub);
    await env.DB.prepare(
      "UPDATE posts SET title=?,body=?,excerpt=?,tags=?,cover=?,pinned=?,comments_open=?,status=?,pub=?,updated=? WHERE id=?",
    )
      .bind(
        title,
        body,
        excerptOf(body),
        JSON.stringify(tags),
        cover,
        flags[0],
        flags[1],
        status,
        pub,
        now,
        id,
      )
      .run();
    return { id, created: false, title };
  }
  const row = await env.DB.prepare(
    "INSERT INTO posts(title,body,excerpt,tags,cover,pinned,comments_open,status,pub,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING id",
  )
    .bind(
      title,
      body,
      excerptOf(body),
      JSON.stringify(tags),
      cover,
      flags[0],
      flags[1],
      status,
      at ?? now,
      now,
      now,
    )
    .first<{ id: number }>();
  return { id: row!.id, created: true, title };
}

export async function deletePost(env: Env, id: number) {
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM reactions WHERE kind='comment' AND target IN (SELECT id FROM comments WHERE post_id=?)",
    ).bind(id),
    env.DB.prepare("DELETE FROM reports WHERE comment_id IN (SELECT id FROM comments WHERE post_id=?)").bind(
      id,
    ),
    env.DB.prepare("DELETE FROM comments WHERE post_id=?").bind(id),
    env.DB.prepare("DELETE FROM reactions WHERE kind='post' AND target=?").bind(id),
    env.DB.prepare("DELETE FROM posts WHERE id=?").bind(id),
  ]);
}
