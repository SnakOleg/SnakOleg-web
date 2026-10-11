import { useState } from "preact/hooks";
import { EMOJI } from "../../shared/blog";
import { Ico } from "../components/ui/Icon";
import type { L } from "../lib/i18n";
import { api, errorText, useMe } from "./api";
import type { CUser, PostBrief, Reactions as R } from "./api";
import { ago, dateOf, strings } from "./strings";
import { Avatar, Link, Menu, Name, ask, openEditor, refreshBlog, toast, useDismiss } from "./ui";
import { site } from "../config";
import avatarCat from "../assets/illustrations/avatar-cat.svg";

export function Reactions({
  kind,
  target,
  reactions,
  mine,
  l,
  onChange,
  small = false,
}: {
  kind: "post" | "comment";
  target: number;
  reactions: R;
  mine: string[];
  l: L;
  onChange: (r: R, m: string[]) => void;
  small?: boolean;
}) {
  const b = strings(l);
  const me = useMe();
  const [pick, setPick] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useDismiss<HTMLDivElement>(pick, () => setPick(false));

  const press = async (emoji: string) => {
    if (!me?.user) return toast(b.needLogin);
    if (busy) return;
    setBusy(true);
    const r = await api<{ reactions: R; mine: string[] }>("/api/blog/react", "POST", { kind, target, emoji });
    setBusy(false);
    if (r.ok) onChange(r.data.reactions, r.data.mine);
    else if (r.data.error === "max_reactions") toast(b.maxReactions);
    else if (r.data.error === "banned") toast(`${b.banTitle}: ${r.data.ban?.reason ?? ""}`);
    else toast(errorText(r.data, b.errors));
  };

  const shown = EMOJI.filter((e) => (reactions[e] ?? 0) > 0 || mine.includes(e));
  return (
    <div class={`rx${small ? " sm" : ""}`} ref={ref}>
      {shown.map((e) => (
        <button
          type="button"
          class={mine.includes(e) ? "pill on" : "pill"}
          aria-pressed={mine.includes(e)}
          aria-label={`${e} ${reactions[e] ?? 0}`}
          onClick={() => void press(e)}
        >
          <span>{e}</span>
          <b>{reactions[e] ?? 0}</b>
        </button>
      ))}
      <button
        type="button"
        class="pill add"
        aria-label={b.addReaction}
        aria-expanded={pick}
        onClick={() => setPick(!pick)}
      >
        <Ico n="smile" />
      </button>
      {pick && (
        <span class="pick" role="group" aria-label={b.react}>
          {EMOJI.map((e) => (
            <button
              type="button"
              onClick={() => {
                setPick(false);
                void press(e);
              }}
            >
              {e}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}

export function Share({ id, title, l }: { id: number; title: string; l: L }) {
  const b = strings(l);
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const url = `${location.origin}/blog/${id}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast(b.copied);
    } catch {
      prompt(b.copyLink, url);
    }
    setOpen(false);
  };
  return (
    <div class="share" ref={ref}>
      <button type="button" class="act" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Ico n="share" />
        <span>{b.share}</span>
      </button>
      {open && (
        <div class="sheet" role="menu">
          <button type="button" role="menuitem" onClick={() => void copy()}>
            <Ico n="copy" />
            {b.copyLink}
          </button>
          <a
            role="menuitem"
            href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <Ico n="telegram" />
            {b.viaTelegram}
          </a>
          {"share" in navigator && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void navigator.share({ title, url }).catch(() => undefined);
              }}
            >
              <Ico n="send" />
              {b.share}…
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function PostMenu({
  id,
  pinned,
  l,
  after,
}: {
  id: number;
  pinned: boolean;
  l: L;
  after?: () => void;
}) {
  const b = strings(l);
  const me = useMe();
  if (!me?.user?.owner) return null;
  const call = async (body: object, done: string) => {
    const r = await api("/api/blog/compose", "POST", body);
    if (!r.ok) return toast(errorText(r.data, b.errors));
    toast(done);
    refreshBlog();
    after?.();
  };
  return (
    <Menu
      l={l}
      items={[
        { label: b.editPost, icon: "edit", run: () => openEditor(id) },
        {
          label: pinned ? b.unpinPost : b.pinPost,
          icon: "pin",
          run: () => void call({ action: "pin", id, on: !pinned }, b.modDone),
        },
        {
          label: b.deletePost,
          icon: "trash",
          danger: true,
          run: () =>
            void ask(b.deletePostAsk, b.deleteYes).then((yes) =>
              yes ? call({ action: "delete", id }, b.modDone) : undefined,
            ),
        },
      ]}
    />
  );
}

export function PostCard({ p, l, onChange }: { p: PostBrief; l: L; onChange: (p: PostBrief) => void }) {
  const b = strings(l);
  const href = `/blog/${p.id}`;
  return (
    <article class={`post${p.pinned ? " pinned" : ""}`}>
      <header class="ph2">
        <img class="ava" src={site.avatar || avatarCat} alt="" width="40" height="40" />
        <div>
          <b>Snak / Oleg</b>
          <small>
            {ago(p.pub, l)}
            {p.pinned && (
              <span class="pin">
                <Ico n="pin" /> {b.pinned}
              </span>
            )}
          </small>
        </div>
        <PostMenu id={p.id} pinned={p.pinned} l={l} />
      </header>
      <h2>
        <Link to={href}>{p.title}</Link>
      </h2>
      {p.excerpt && <p class="ex">{p.excerpt}</p>}
      {p.cover && (
        <Link to={href} aria-label={p.title}>
          <img
            class="cover"
            src={p.cover}
            alt=""
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
          />
        </Link>
      )}
      {p.tags.length > 0 && (
        <ul class="tags">
          {p.tags.map((t) => (
            <li>
              <Link to={`/blog?tag=${encodeURIComponent(t)}`} keep>
                #{t}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <footer class="pf">
        <Reactions
          kind="post"
          target={p.id}
          reactions={p.reactions}
          mine={p.mine}
          l={l}
          onChange={(reactions, mine) => onChange({ ...p, reactions, mine })}
        />
        <span class="pstat">
          <Link to={`${href}#comments`} class="act">
            <Ico n="message" />
            <span>{p.comments}</span>
          </Link>
          <span class="act" title={b.views}>
            <Ico n="eye" />
            <span>{p.views}</span>
          </span>
          <Share id={p.id} title={p.title} l={l} />
        </span>
      </footer>
    </article>
  );
}

type Liker = { user: CUser; emoji: string; created: number };

export function Views({ post, views, l }: { post: number; views: number; l: L }) {
  const b = strings(l);
  const me = useMe();
  const [rows, setRows] = useState<Liker[] | null>(null);
  const [open, setOpen] = useState(false);
  if (!me?.user?.owner) return <>{views}</>;

  const show = () => {
    setOpen(true);
    setRows(null);
    void api<{ people: Liker[] }>(`/api/blog/react?post=${post}`).then((r) => r.ok && setRows(r.data.people));
  };
  const people = new Map<string, { user: CUser; emoji: string[]; created: number }>();
  for (const r of rows ?? []) {
    const p = people.get(r.user.id);
    if (p) p.emoji.push(r.emoji);
    else people.set(r.user.id, { user: r.user, emoji: [r.emoji], created: r.created });
  }
  return (
    <>
      <button type="button" class="linkbtn viewsbtn" title={b.likers} onClick={show}>
        {views}
      </button>
      {open && (
        <div
          class="modback"
          role="dialog"
          aria-modal="true"
          aria-label={b.likers}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div class="moddlg likers">
            <h3>{b.likers}</h3>
            {rows === null ? (
              <p class="muted">{b.loading}</p>
            ) : people.size === 0 ? (
              <p class="muted">{b.likersNone}</p>
            ) : (
              <ul>
                {[...people.values()].map((p) => (
                  <li>
                    <Avatar user={p.user} size={28} />
                    <Name user={p.user} l={l} />
                    <span class="em">{p.emoji.join("")}</span>
                    <time title={dateOf(p.created, l)}>{ago(p.created, l)}</time>
                  </li>
                ))}
              </ul>
            )}
            <div class="row">
              <button type="button" class="btn" onClick={() => setOpen(false)}>
                {b.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
