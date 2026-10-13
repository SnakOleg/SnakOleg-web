import { plainText } from "../../shared/blog";
import type { Env } from "../api/_lib";

type Assets = Env & { ASSETS: Fetcher };

const xml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  );

async function shell(env: Assets, url: URL) {
  let res = await env.ASSETS.fetch(new Request(new URL("/blog", url), { redirect: "manual" }));
  if (res.status >= 300 && res.status < 400) {
    const to = res.headers.get("Location");
    if (to) res = await env.ASSETS.fetch(new Request(new URL(to, url)));
  }
  return res;
}

export const onRequestGet: PagesFunction<Assets> = async ({ request, env, params }) => {
  const url = new URL(request.url);
  const seg = ([] as string[]).concat(params.path ?? []);
  const now = Date.now();

  if (seg[0] === "rss.xml" && seg.length === 1) {
    const { results } = await env.DB.prepare(
      "SELECT id,title,excerpt,tags,pub FROM posts WHERE status='published' AND pub<=? ORDER BY pub DESC LIMIT 30",
    )
      .bind(now)
      .all<{ id: number; title: string; excerpt: string; tags: string; pub: number }>();
    const items = results
      .map(
        (p) =>
          `<item><title>${xml(p.title)}</title><link>${url.origin}/blog/${p.id}</link><guid>${url.origin}/blog/${p.id}</guid><pubDate>${new Date(p.pub).toUTCString()}</pubDate><description>${xml(plainText(p.excerpt))}</description>${(JSON.parse(p.tags) as string[]).map((t) => `<category>${xml(t)}</category>`).join("")}</item>`,
      )
      .join("");
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Snak / Oleg: блог</title><link>${url.origin}/blog</link><description>Мини-блог Снака (Олега)</description>${items}</channel></rss>`,
      {
        headers: {
          "Content-Type": "application/rss+xml; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  }

  const page = await shell(env, url);
  if (!seg.length || (seg.length === 1 && seg[0] === "guestbook")) return page;
  const id = Number(seg[0]);
  if (seg.length > 1 || !/^\d+$/.test(seg[0]))
    return new Response(page.body, { status: 404, headers: page.headers });

  const post = await env.DB.prepare("SELECT id,title FROM posts WHERE id=? AND status='published' AND pub<=?")
    .bind(id, now)
    .first<{ id: number; title: string }>();
  if (!post) return new Response(page.body, { status: 404, headers: page.headers });

  const title = `${post.title} - Snak / Oleg`;
  const meta = (selector: string, value: string, attr = "content") => ({
    selector,
    value,
    attr,
  });
  const swaps = [meta('link[rel="canonical"]', `${url.origin}/blog/${post.id}`, "href")];
  let rewriter = new HTMLRewriter().on("title", {
    element(el) {
      el.setInnerContent(title);
    },
  });
  for (const s of swaps)
    rewriter = rewriter.on(s.selector, {
      element(el) {
        el.setAttribute(s.attr, s.value);
      },
    });
  const out = rewriter.transform(page);
  const headers = new Headers(out.headers);
  headers.set("Cache-Control", "public, max-age=60");
  return new Response(out.body, { status: 200, headers });
};
