import { useEffect, useState } from "preact/hooks";
import { Shell } from "../components/Shell";
import { Ico } from "../components/ui/Icon";
import { site } from "../config";
import { renderPost } from "../lib/markdown";
import type { Toc } from "../lib/markdown";
import type { L } from "../lib/i18n";
import { api } from "./api";
import type { PostBrief, PostFull } from "./api";
import { Comments } from "./Comments";
import { EditorHost } from "./Editor";
import { PostCard, PostMenu, Reactions, Share, Views } from "./parts";
import { dateOf, strings } from "./strings";
import { Account, AskHost, Avatar, Link, Toasts, go, openEditor, usePath, useRefresh } from "./ui";
import { useMe } from "./api";
import avatarCat from "../assets/illustrations/avatar-cat.svg";
import "./blog.scss";

type Feed = { posts: PostBrief[]; next: number | null; tags: [string, number][] };

const TOP_TOPICS = 20;

function Topics({ l, tags, tag }: { l: L; tags: [string, number][]; tag: string }) {
  const b = strings(l);
  const [all, setAll] = useState(false);
  const [find, setFind] = useState("");
  if (!tags.length) return null;
  const top = tags.slice(0, TOP_TOPICS);
  if (tag && !top.some(([t]) => t === tag)) top.push([tag, tags.find(([t]) => t === tag)?.[1] ?? 0]);
  const list = all ? tags.filter(([t]) => t.includes(find.trim().toLowerCase())) : top;
  const chip = ([t, n]: [string, number]) => (
    <li>
      <Link to={`/blog?tag=${encodeURIComponent(t)}`} class={tag === t ? "on" : ""} keep>
        #{t} <small>{n}</small>
      </Link>
    </li>
  );
  return (
    <div class="box">
      <h3>{b.tags}</h3>
      {all && tags.length > 20 && (
        <input
          class="tfind"
          type="search"
          value={find}
          placeholder={b.findTopic}
          aria-label={b.findTopic}
          onInput={(e) => setFind((e.target as HTMLInputElement).value)}
        />
      )}
      <ul class={`tags${all ? " scroll" : ""}`}>
        <li>
          <Link to="/blog" class={!tag ? "on" : ""} keep>
            {b.allPosts}
          </Link>
        </li>
        {list.map(chip)}
      </ul>
      {tags.length > top.length && (
        <button type="button" class="linkbtn tmore" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? b.fewerTopics : `${b.allTopics} (${tags.length})`}
        </button>
      )}
    </div>
  );
}

function Sidebar({ l, tags, tag, q }: { l: L; tags: [string, number][]; tag: string; q: string }) {
  const b = strings(l);
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);
  return (
    <aside class="side">
      <Account l={l} />
      <form
        class="box search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(text.trim() ? `/blog?q=${encodeURIComponent(text.trim())}` : "/blog", true);
        }}
      >
        <Ico n="search" />
        <input
          type="search"
          value={text}
          placeholder={b.search}
          aria-label={b.search}
          onInput={(e) => setText((e.target as HTMLInputElement).value)}
        />
      </form>
      <Topics l={l} tags={tags} tag={tag} />
      <div class="box rules">
        <h3>{b.rules}</h3>
        <ul>
          {b.rulesList.map((r) => (
            <li>{r}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function FeedPage({ l, search }: { l: L; search: string }) {
  const b = strings(l);
  const params = new URLSearchParams(search);
  const tag = params.get("tag") ?? "";
  const q = params.get("q") ?? "";
  const [feed, setFeed] = useState<Feed | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setFailed(false);
    const r = await api<Feed>(
      `/api/blog/posts?${new URLSearchParams({ ...(tag && { tag }), ...(q && { q }) })}`,
    );
    if (r.ok) setFeed(r.data);
    else setFailed(true);
  };
  useEffect(() => {
    setFeed(null);
    void load();
    document.title = `${b.title} - Snak / Oleg`;
  }, [tag, q, l]);
  useRefresh(() => void load());
  const me = useMe();

  const more = async () => {
    if (!feed?.next) return;
    setBusy(true);
    const r = await api<Feed>(
      `/api/blog/posts?${new URLSearchParams({ ...(tag && { tag }), ...(q && { q }), before: String(feed.next) })}`,
    );
    setBusy(false);
    if (r.ok) setFeed({ ...feed, posts: [...feed.posts, ...r.data.posts], next: r.data.next });
  };
  const total = feed?.posts.length ?? 0;
  const views = feed?.posts.reduce((n, p) => n + p.views, 0) ?? 0;

  return (
    <>
      <header class="profile">
        <div class="banner" aria-hidden="true" />
        <div class="pbody">
          <img class="pav" src={site.avatar || avatarCat} alt="" width="84" height="84" />
          <div class="pname">
            <h1>Snak / Oleg</h1>
            <p class="handle">@The_Nikeri</p>
          </div>
          <p class="bio">{b.tagline}</p>
          <div class="pstats">
            <span>
              <b>{total}</b> {b.posts}
            </span>
            <span>
              <b>{views}</b> {b.views}
            </span>
            <a href="https://t.me/SnakOleg" target="_blank" rel="noopener noreferrer">
              <Ico n="telegram" /> {b.channel}
            </a>
            <a href="/blog/rss.xml">
              <Ico n="rss" /> {b.rss}
            </a>
          </div>
        </div>
      </header>

      <div class="bcols">
        <div class="feed" id="main">
          {(tag || q) && (
            <p class="filter">
              {tag ? `#${tag}` : `«${q}»`}{" "}
              <Link to="/blog" class="linkbtn">
                ×
              </Link>
            </p>
          )}
          {me?.user?.owner && !tag && !q && (
            <button type="button" class="newpost" onClick={() => openEditor(0)}>
              <Avatar user={me.user} size={40} />
              <span>{b.whatsNew}</span>
              <em>{b.newPost}</em>
            </button>
          )}
          {failed ? (
            <p class="muted">
              {b.failed}{" "}
              <button type="button" class="linkbtn" onClick={() => void load()}>
                {b.retry}
              </button>
            </p>
          ) : !feed ? (
            <p class="muted">{b.loading}</p>
          ) : feed.posts.length === 0 ? (
            <p class="muted">{tag || q ? b.nothing : b.empty}</p>
          ) : (
            feed.posts.map((p) => (
              <PostCard
                p={p}
                l={l}
                onChange={(np) =>
                  setFeed({ ...feed, posts: feed.posts.map((x) => (x.id === np.id ? np : x)) })
                }
              />
            ))
          )}
          {feed?.next && (
            <button type="button" class="btn wide" disabled={busy} onClick={() => void more()}>
              {busy ? b.loading : b.more}
            </button>
          )}
        </div>
        <Sidebar l={l} tags={feed?.tags ?? []} tag={tag} q={q} />
      </div>
    </>
  );
}

function PostPage({ id, l }: { id: number; l: L }) {
  const b = strings(l);
  const [data, setData] = useState<{
    post: PostFull;
    prev: { id: number; title: string } | null;
    next: { id: number; title: string } | null;
  } | null>(null);
  const [missing, setMissing] = useState(false);

  const load = (first: boolean) =>
    api<NonNullable<typeof data>>(`/api/blog/posts/${id}`).then((r) => {
      if (!r.ok) return setMissing(true);
      setData(r.data);
      document.title = `${r.data.post.title} - Snak / Oleg`;
      if (first) void api("/api/blog/view", "POST", { post: id });
    });
  useEffect(() => {
    setData(null);
    setMissing(false);
    void load(true);
  }, [id]);
  useRefresh(() => void load(false));

  useEffect(() => {
    if (data && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [data]);

  if (missing)
    return (
      <div class="single" id="main">
        <p class="muted">{b.notFound}</p>
        <Link to="/blog" class="btn">
          {b.back}
        </Link>
      </div>
    );
  if (!data)
    return (
      <div class="single" id="main">
        <p class="muted">{b.loading}</p>
      </div>
    );

  const { post, prev, next } = data;
  const doc = renderPost(post.body);
  const mins = Math.max(1, Math.round((post.body.match(/\S+/g)?.length ?? 0) / 200));
  return (
    <div class="single" id="main">
      <Link to="/blog" class="back">
        <Ico n="arrow-right" /> {b.back}
      </Link>
      <article class="art-post">
        {post.cover && (
          <img class="cover" src={post.cover} alt="" decoding="async" referrerpolicy="no-referrer" />
        )}
        <div class="ptop">
          <h1>{post.title}</h1>
          <PostMenu id={post.id} pinned={post.pinned} l={l} after={() => go("/blog")} />
        </div>
        <p class="meta">
          {dateOf(post.pub, l)} · {mins} {b.min} · <Ico n="eye" />{" "}
          <Views post={post.id} views={post.views} l={l} />
        </p>
        {post.tags.length > 0 && (
          <ul class="tags">
            {post.tags.map((t) => (
              <li>
                <Link to={`/blog?tag=${encodeURIComponent(t)}`}>#{t}</Link>
              </li>
            ))}
          </ul>
        )}
        <div class="body">
          {doc.toc.length > 2 && <Contents toc={doc.toc} title={b.toc} />}
          <div class="md post-md" dangerouslySetInnerHTML={{ __html: doc.html }} />
        </div>
        <footer class="pf">
          <Reactions
            kind="post"
            target={post.id}
            reactions={post.reactions}
            mine={post.mine}
            l={l}
            onChange={(reactions, mine) => setData({ ...data, post: { ...post, reactions, mine } })}
          />
          <Share id={post.id} title={post.title} l={l} />
        </footer>
      </article>
      <nav class="pn" aria-label={b.title}>
        {prev ? (
          <Link to={`/blog/${prev.id}`}>
            <small>{b.prev}</small>
            {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/blog/${next.id}`} class="r">
            <small>{b.next}</small>
            {next.title}
          </Link>
        ) : (
          <span />
        )}
      </nav>
      <Comments post={post.id} open={post.commentsOpen} l={l} />
    </div>
  );
}

const spoiler = (e: MouseEvent) => {
  const t = (e.target as HTMLElement).closest(".spoiler");
  t?.classList.toggle("show");
};

function Contents({ toc, title }: { toc: Toc; title: string }) {
  return (
    <nav class="toc" aria-label={title}>
      <h3>{title}</h3>
      <ul>
        {toc.map((h) => (
          <li style={{ "--lv": h.level - 1 }}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Page({ l }: { l: L }) {
  const path = usePath();
  const [pathname, search = ""] = path.split("?");
  const m = /^\/blog\/(\d+)\/?$/.exec(pathname);
  useEffect(() => {
    document.documentElement.lang = l;
  }, [l]);
  return (
    <div class="blog" onClick={spoiler}>
      {m ? <PostPage id={Number(m[1])} l={l} /> : <FeedPage l={l} search={search} />}
      <EditorHost l={l} />
      <Toasts />
      <AskHost l={l} />
    </div>
  );
}

export function Blog() {
  return <Shell page="blog">{({ l }) => <Page l={l} />}</Shell>;
}
