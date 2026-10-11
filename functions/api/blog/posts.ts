import { getUser } from "../_blog";
import { Env, json } from "../_lib";
import { likeEscape, reactionsFor } from "./_shared";

const PAGE = 8;
type Row = {
  id: number;
  title: string;
  excerpt: string;
  tags: string;
  cover: string;
  pinned: number;
  pub: number;
  views: number;
  cc: number;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const q = new URL(request.url).searchParams;
  const tag = (q.get("tag") ?? "").slice(0, 30);
  const text = (q.get("q") ?? "").trim().slice(0, 60);
  const asked = Number(q.get("before"));
  const before = Number.isFinite(asked) && asked > 0 ? Math.floor(asked) : 0;
  const now = Date.now();

  const where = ["status='published'", "pub<=?1"];
  const args: unknown[] = [now];
  if (tag) {
    args.push(`%"${likeEscape(tag)}"%`);
    where.push(`tags LIKE ?${args.length} ESCAPE '\\'`);
  }
  if (text) {
    args.push(`%${likeEscape(text)}%`);
    where.push(`(title LIKE ?${args.length} ESCAPE '\\' OR body LIKE ?${args.length} ESCAPE '\\')`);
  }
  const cursor = before ? ` AND pub<${before}` : "";
  const base = `SELECT id,title,excerpt,tags,cover,pinned,pub,views,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id=posts.id AND c.status IN ('visible','flagged')) cc
    FROM posts WHERE ${where.join(" AND ")}`;

  const pinned =
    before || text || tag
      ? []
      : (
          await env.DB.prepare(`${base} AND pinned=1 ORDER BY pub DESC LIMIT 3`)
            .bind(...args)
            .all<Row>()
        ).results;
  const rest = await env.DB.prepare(`${base} AND pinned=0${cursor} ORDER BY pub DESC LIMIT ${PAGE + 1}`)
    .bind(...args)
    .all<Row>();
  const more = rest.results.length > PAGE;
  const rows = [...pinned, ...rest.results.slice(0, PAGE)];

  const me = await getUser(request, env);
  const { counts, mine } = await reactionsFor(
    env,
    "post",
    rows.map((r) => r.id),
    me?.id ?? null,
  );
  const tags = await env.DB.prepare("SELECT tags FROM posts WHERE status='published' AND pub<=?")
    .bind(now)
    .all<{ tags: string }>();
  const cloud = new Map<string, number>();
  for (const t of tags.results)
    for (const x of JSON.parse(t.tags) as string[]) cloud.set(x, (cloud.get(x) ?? 0) + 1);

  return json(
    {
      posts: rows.map((r) => ({
        id: r.id,
        title: r.title,
        excerpt: r.excerpt,
        tags: JSON.parse(r.tags),
        cover: r.cover,
        pinned: !!r.pinned,
        pub: r.pub,
        views: r.views,
        comments: r.cc,
        reactions: counts.get(r.id) ?? {},
        mine: mine.get(r.id) ?? [],
      })),
      next: more ? rest.results[PAGE - 1].pub : null,
      tags: [...cloud].sort((a, b) => b[1] - a[1]).slice(0, 100),
    },
    200,
    me ? {} : { "Cache-Control": "public, max-age=30, s-maxage=60" },
  );
};
