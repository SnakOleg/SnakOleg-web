import { useEffect, useState } from "preact/hooks";
import { api } from "../blog/api";
import type { PostBrief } from "../blog/api";
import { ago, strings } from "../blog/strings";
import type { L } from "../lib/i18n";
import { Ico } from "./ui/Icon";

export function BlogPreview({ l }: { l: L }) {
  const b = strings(l);
  const [posts, setPosts] = useState<PostBrief[] | null>(null);
  useEffect(() => {
    void api<{ posts: PostBrief[] }>("/api/blog/posts").then((r) => {
      setPosts(r.ok && Array.isArray(r.data.posts) ? r.data.posts.slice(0, 3) : []);
    });
  }, []);
  if (!posts) return null;
  return (
    <section class="bp" aria-labelledby="bp-h">
      <div class="bph">
        <h2 id="bp-h" class="ph">
          {b.fromBlog}
        </h2>
        <a class="bpmore" href="/blog">
          {b.openBlog} <Ico n="arrow-right" />
        </a>
      </div>
      {posts.length === 0 && <p class="bpnone">{b.soon}</p>}
      <ul class="bpl">
        {posts.map((p) => (
          <li>
            <a href={`/blog/${p.id}`}>
              <time>{ago(p.pub, l)}</time>
              <b>{p.title}</b>
              <span>{p.excerpt}</span>
              <small>
                <Ico n="message" /> {p.comments}
                <Ico n="eye" /> {p.views}
                {Object.entries(p.reactions)
                  .slice(0, 3)
                  .map(([e, n]) => (
                    <em>
                      {e} {n}
                    </em>
                  ))}
              </small>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
