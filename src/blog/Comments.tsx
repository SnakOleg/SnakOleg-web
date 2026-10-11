import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { COMMENT_MAX, EDIT_WINDOW_MS } from "../../shared/blog";
import { Ico } from "../components/ui/Icon";
import { renderComment } from "../lib/markdown";
import type { L } from "../lib/i18n";
import { api, errorText, useMe } from "./api";
import type { Cmt } from "./api";
import { Reactions } from "./parts";
import { ago, strings } from "./strings";
import { Avatar, BanNotice, LoginButton, Menu, Name, ask, toast } from "./ui";
import { site } from "../config";
import avatarCat from "../assets/illustrations/avatar-cat.svg";

function Body({ c, l }: { c: Cmt; l: L }) {
  const b = strings(l);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!c.flagged) return <div class="md" dangerouslySetInnerHTML={{ __html: renderComment(c.body) }} />;

  // Possible spam: only the label is sent. The text is fetched on demand and its links are not clickable.
  const reveal = async () => {
    setBusy(true);
    const r = await api<{ body: string }>(`/api/blog/comments/${c.id}/reveal`);
    setBusy(false);
    if (r.ok) setText(r.data.body);
    else toast(errorText(r.data, b.errors));
  };
  return (
    <div class="spam">
      <p class="label">
        <Ico n="flag" /> <b>{b.spam}</b>
      </p>
      {text === null ? (
        <>
          <p class="note">{b.spamNote}</p>
          <button type="button" class="linkbtn" disabled={busy} onClick={() => void reveal()}>
            {b.showAnyway}
          </button>
        </>
      ) : (
        <>
          <div class="md off" dangerouslySetInnerHTML={{ __html: renderComment(text, false) }} />
          <p class="note">{b.linksOff}</p>
          <button type="button" class="linkbtn" onClick={() => setText(null)}>
            {b.hide}
          </button>
        </>
      )}
    </div>
  );
}

type ItemProps = {
  c: Cmt;
  l: L;
  canReply: boolean;
  replyName?: string;
  line?: boolean;
  onReply: (c: Cmt) => void;
  onPatch: (id: number, p: Partial<Cmt> | null) => void;
  onReload: () => void;
  onBan: (c: Cmt) => void;
};

function Item({ c, l, canReply, replyName, line, onReply, onPatch, onReload, onBan }: ItemProps) {
  const b = strings(l);
  const me = useMe();
  const [edit, setEdit] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);
  const editable = c.own && Date.now() - c.created < EDIT_WINDOW_MS;
  const owner = !!me?.user?.owner;

  const save = async () => {
    const r = await api<{ status: string; body: string }>(`/api/blog/comments/${c.id}`, "PATCH", {
      body: edit,
    });
    if (!r.ok) return toast(errorText(r.data, b.errors));
    onPatch(c.id, { body: r.data.body, flagged: r.data.status === "flagged", edited: Date.now() });
    setEdit(null);
  };
  const remove = async () => {
    if (!(await ask(b.deleteAsk, b.deleteYes))) return;
    const r = await api(`/api/blog/comments/${c.id}`, "DELETE");
    if (r.ok) onPatch(c.id, { deleted: true, body: "", user: null });
    else toast(errorText(r.data, b.errors));
  };
  const moderate = async (to: "visible" | "hidden" | "deleted") => {
    if (
      to !== "visible" &&
      !(await ask(to === "hidden" ? b.modHideAsk : b.modDeleteAsk, to === "hidden" ? b.hideYes : b.deleteYes))
    )
      return;
    const r = await api("/api/blog/mod", "POST", { action: "comment", comment: c.id, to });
    if (!r.ok) return toast(errorText(r.data, b.errors));
    if (to === "visible") onReload();
    else onPatch(c.id, { deleted: true, body: "", user: null });
    toast(b.modDone);
  };

  const mine = c.own;
  const items = [
    editable && { label: b.edit, icon: "edit", run: () => setEdit(c.body) },
    mine && { label: b.delete, icon: "trash", danger: true, run: () => void remove() },
    !mine && !!me?.user && !reported && { label: b.report, icon: "flag", run: () => setReporting(true) },
    owner && c.flagged && { label: b.modShow, icon: "check", run: () => void moderate("visible") },
    owner && !mine && { label: b.modHide, icon: "eye", run: () => void moderate("hidden") },
    owner &&
      !mine && { label: b.modDelete, icon: "trash", danger: true, run: () => void moderate("deleted") },
    owner &&
      !mine &&
      !!c.user &&
      !c.user.owner && { label: b.modBan, icon: "ban", danger: true, run: () => onBan(c) },
  ];
  const liked = c.byOwner && c.byOwner.length > 0;

  return (
    <article class={`cm${liked ? " liked" : ""}`} id={`c${c.id}`}>
      <div class="avcol">
        <Avatar user={c.user} size={32} />
        {line && <i class="thread" aria-hidden="true" />}
      </div>
      <div class="cbody">
        <header>
          {c.user ? <Name user={c.user} l={l} /> : <b class="nm">…</b>}
          <time>
            {ago(c.created, l)}
            {c.edited ? ` · ${b.edited}` : ""}
          </time>
          {edit === null && <Menu items={items} l={l} />}
        </header>
        {replyName && (
          <p class="to">
            <Ico n="reply" /> {b.inReplyTo} <b>{replyName}</b>
          </p>
        )}
        {c.pending && <p class="pend">{b.pending}</p>}
        {edit !== null ? (
          <div class="editor">
            <textarea
              value={edit}
              maxLength={COMMENT_MAX}
              rows={3}
              onInput={(e) => setEdit((e.target as HTMLTextAreaElement).value)}
            />
            <div class="row">
              <button type="button" class="btn" disabled={!edit.trim()} onClick={() => void save()}>
                {b.save}
              </button>
              <button type="button" class="link" onClick={() => setEdit(null)}>
                {b.cancel}
              </button>
            </div>
          </div>
        ) : (
          <Body c={c} l={l} />
        )}
        {edit === null && (
          <footer class="ca">
            <Reactions
              kind="comment"
              target={c.id}
              reactions={c.reactions}
              mine={c.mine}
              l={l}
              small
              onChange={(reactions, mine) =>
                onPatch(c.id, owner ? { reactions, mine, byOwner: mine } : { reactions, mine })
              }
            />
            {canReply && (
              <button type="button" class="act" onClick={() => onReply(c)}>
                <Ico n="reply" /> {b.reply}
              </button>
            )}
            {liked && (
              <span class="byowner" title={b.byAuthor}>
                <img src={site.avatar || avatarCat} alt="" width="16" height="16" />
                {c.byOwner!.join(" ")}
                <small>{b.byAuthor}</small>
              </span>
            )}
          </footer>
        )}
      </div>
      {reporting && (
        <ReportDialog
          c={c}
          l={l}
          onClose={() => setReporting(false)}
          onSent={() => {
            setReporting(false);
            setReported(true);
          }}
        />
      )}
    </article>
  );
}

const REASON_KEYS = ["spam", "abuse", "scam", "other"];

function ReportDialog({ c, l, onClose, onSent }: { c: Cmt; l: L; onClose: () => void; onSent: () => void }) {
  const b = strings(l);
  const [why, setWhy] = useState(REASON_KEYS[0]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async (e: Event) => {
    e.preventDefault();
    setBusy(true);
    const r = await api("/api/blog/report", "POST", {
      comment: c.id,
      reason: [why, text.trim()].filter(Boolean).join(": "),
    });
    setBusy(false);
    if (!r.ok) return toast(errorText(r.data, b.errors));
    toast(b.reported);
    onSent();
  };
  return (
    <div
      class="modback"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form class="moddlg" onSubmit={(e) => void send(e)}>
        <h3>{b.reportTitle}</h3>
        <fieldset class="why">
          <legend>{b.reportWhy}</legend>
          {REASON_KEYS.map((k, i) => (
            <label class="chk">
              <input type="radio" name="why" checked={why === k} onChange={() => setWhy(k)} />
              {b.reportReasons[i]}
            </label>
          ))}
        </fieldset>
        <label>
          {b.reportDetails}
          <input
            value={text}
            maxLength={100}
            onInput={(e) => setText((e.target as HTMLInputElement).value)}
          />
        </label>
        <div class="row">
          <button type="button" class="link" onClick={onClose}>
            {b.cancel}
          </button>
          <button type="submit" class="btn" disabled={busy}>
            {b.reportSend}
          </button>
        </div>
      </form>
    </div>
  );
}

function Composer({
  post,
  to,
  l,
  inline = false,
  onDone,
  onCancel,
}: {
  post: number;
  to: Cmt | null;
  l: L;
  inline?: boolean;
  onDone: (c: Cmt) => void;
  onCancel?: () => void;
}) {
  const b = strings(l);
  const me = useMe();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (inline) box.current?.focus();
  }, []);
  if (!me?.user) return null;

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy || !text.trim()) return;
    setBusy(true);
    setErr("");
    const r = await api<{ comment: Cmt }>("/api/blog/comments", "POST", { post, body: text, parent: to?.id });
    setBusy(false);
    if (r.ok) {
      setText("");
      onDone(r.data.comment);
    } else if (r.data.error === "banned") {
      setErr("banned");
      void import("./api").then((m) => m.refreshMe());
    } else setErr(errorText(r.data, b.errors));
  };

  return (
    <form class={`compose${inline ? " inline" : ""}`} onSubmit={(e) => void submit(e)}>
      <Avatar user={me.user} size={inline ? 30 : 40} />
      <div class="in">
        {to && (
          <p class="rt">
            {b.replyTo} <b>{to.user?.name}</b>
          </p>
        )}
        <textarea
          ref={box}
          value={text}
          rows={inline ? 2 : 3}
          maxLength={COMMENT_MAX}
          placeholder={b.placeholder}
          aria-label={b.writeComment}
          onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
          onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && void submit(e)}
        />
        <div class="row">
          <small class={text.length > COMMENT_MAX - 100 ? "warn" : ""}>
            {text.length}/{COMMENT_MAX} {b.chars}
          </small>
          {err && err !== "banned" && (
            <span class="err" role="alert">
              {err}
            </span>
          )}
          {onCancel && (
            <button type="button" class="link" onClick={onCancel}>
              {b.cancel}
            </button>
          )}
          <button type="submit" class="btn" disabled={busy || !text.trim()}>
            <Ico n="send" />
            {busy ? b.sending : b.send}
          </button>
        </div>
      </div>
    </form>
  );
}

function BanDialog({ c, l, onClose }: { c: Cmt; l: L; onClose: () => void }) {
  const b = strings(l);
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState(b.modReasonDefault);
  const [purge, setPurge] = useState(false);
  const [busy, setBusy] = useState(false);
  const go = async (e: Event) => {
    e.preventDefault();
    setBusy(true);
    const r = await api("/api/blog/mod", "POST", {
      action: "ban",
      user: c.user?.id,
      days: Number(days) || null,
      reason,
      purge,
    });
    setBusy(false);
    if (!r.ok) return toast(errorText(r.data, b.errors));
    toast(b.modDone);
    onClose();
  };
  return (
    <div
      class="modback"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form class="moddlg" onSubmit={(e) => void go(e)}>
        <h3>
          {b.modTitle}: {c.user?.name}
        </h3>
        <label>
          {b.modDays}
          <select value={days} onChange={(e) => setDays((e.target as HTMLSelectElement).value)}>
            {["1", "7", "30", "0"].map((v, i) => (
              <option value={v}>{b.modTerms[i]}</option>
            ))}
          </select>
        </label>
        <label>
          {b.modReason}
          <input
            value={reason}
            maxLength={200}
            onInput={(e) => setReason((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class="chk">
          <input
            type="checkbox"
            checked={purge}
            onChange={(e) => setPurge((e.target as HTMLInputElement).checked)}
          />
          {b.modPurge}
        </label>
        <div class="row">
          <button type="button" class="link" onClick={onClose}>
            {b.cancel}
          </button>
          <button type="submit" class="btn" disabled={busy}>
            {b.modConfirm}
          </button>
        </div>
      </form>
    </div>
  );
}

const PREVIEW_KIDS = 2;
const MAX_DEPTH = 3;
type Sort = "new" | "top" | "old";
const score = (c: Cmt) => Object.values(c.reactions).reduce((n, x) => n + x, 0);

export function Comments({
  post,
  open,
  l,
  onCount,
}: {
  post: number;
  open: boolean;
  l: L;
  onCount?: (n: number) => void;
}) {
  const b = strings(l);
  const me = useMe();
  const [list, setList] = useState<Cmt[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [to, setTo] = useState<Cmt | null>(null);
  const [banning, setBanning] = useState<Cmt | null>(null);
  const [opened, setOpened] = useState<Set<number>>(new Set());
  const [sort, setSort] = useState<Sort>("new");

  const load = () =>
    api<{ comments: Cmt[] }>(`/api/blog/comments?post=${post}`).then((r) =>
      r.ok ? setList(r.data.comments.filter((c) => !c.deleted)) : setFailed(true),
    );
  useEffect(() => void load(), [post]);
  useEffect(() => {
    if (list) onCount?.(list.length);
  }, [list]);

  const { roots, kids, names } = useMemo(() => {
    const byId = new Map((list ?? []).map((c) => [c.id, c]));
    const kids = new Map<number, Cmt[]>();
    const roots: Cmt[] = [];
    const names = new Map<number, string>();
    for (const c of list ?? []) {
      if (c.user) names.set(c.id, c.user.name);
      const up = byId.has(c.to ?? -1) ? c.to! : byId.has(c.parent ?? -1) ? c.parent! : null;
      if (up === null) roots.push(c);
      else kids.set(up, [...(kids.get(up) ?? []), c]);
    }
    const by: Record<Sort, (a: Cmt, z: Cmt) => number> = {
      new: (a, z) => z.created - a.created,
      old: (a, z) => a.created - z.created,
      top: (a, z) => score(z) - score(a) || z.created - a.created,
    };
    roots.sort(by[sort]);
    return { roots, kids, names };
  }, [list, sort]);

  const patch = (id: number, p: Partial<Cmt> | null) =>
    setList((cur) => {
      if (!cur) return cur;
      if (!p?.deleted) return cur.map((c) => (c.id === id ? { ...c, ...p } : c));
      const gone = new Set([id]);
      for (let grew = true; grew;) {
        grew = false;
        for (const c of cur) {
          const up = c.to ?? c.parent;
          if (!gone.has(c.id) && up && gone.has(up)) (gone.add(c.id), (grew = true));
        }
      }
      return cur.filter((c) => !gone.has(c.id));
    });

  const ban = me?.bans?.blog;
  const closed = !open || me?.settings.commentsOpen === false;
  const canReply = !closed && !!me?.user && !ban;
  const total = list?.length ?? 0;

  const added = (c: Cmt) => {
    setList((cur) => [...(cur ?? []), c]);
    setOpened((s) => {
      const next = new Set(s);
      for (let up = c.to; up; up = (list ?? []).find((x) => x.id === up)?.to) next.add(up);
      return next;
    });
    setTo(null);
  };

  const descendants = (id: number): Cmt[] => (kids.get(id) ?? []).flatMap((k) => [k, ...descendants(k.id)]);

  const node = (c: Cmt, depth: number, flat = false) => {
    const direct = flat ? [] : depth >= MAX_DEPTH ? descendants(c.id) : (kids.get(c.id) ?? []);
    const folded = direct.length > PREVIEW_KIDS + 1 && !opened.has(c.id);
    const shown = folded ? direct.slice(0, PREVIEW_KIDS) : direct;
    const sameColumn = depth >= MAX_DEPTH;
    return (
      <li class="node" key={c.id}>
        <Item
          c={c}
          l={l}
          line={direct.length > 0 && !sameColumn}
          canReply={canReply}
          replyName={flat || depth > MAX_DEPTH - 1 ? names.get(c.to ?? -1) : undefined}
          onReply={(x) => setTo(to?.id === x.id ? null : x)}
          onPatch={patch}
          onReload={() => void load()}
          onBan={setBanning}
        />
        {to?.id === c.id && (
          <div class="inline-form">
            <Composer post={post} to={c} l={l} inline onDone={added} onCancel={() => setTo(null)} />
          </div>
        )}
        {shown.length > 0 && (
          <ul class={`kids${sameColumn ? " same" : ""}`}>
            {shown.map((k) => node(k, depth + 1, sameColumn))}
            {folded && (
              <li class="node more">
                <button type="button" class="linkbtn" onClick={() => setOpened(new Set(opened).add(c.id))}>
                  {b.moreReplies(direct.length - PREVIEW_KIDS)}
                </button>
              </li>
            )}
          </ul>
        )}
      </li>
    );
  };

  return (
    <section class="comments" id="comments" aria-labelledby="cm-h">
      <h2 id="cm-h">
        {b.comments} <span>{total}</span>
      </h2>

      {closed ? (
        <p class="muted">{b.closed}</p>
      ) : !me ? null : !me.user ? (
        <div class="gate">
          <LoginButton l={l} />
          <p class="hint">{b.loginHint}</p>
        </div>
      ) : ban ? (
        <BanNotice ban={ban} scope="blog" l={l} />
      ) : (
        <Composer post={post} to={null} l={l} onDone={added} />
      )}

      {total > 1 && (
        <div class="sorts" role="group" aria-label={b.sortLabel}>
          {(["new", "top", "old"] as Sort[]).map((k) => (
            <button
              type="button"
              class={sort === k ? "on" : ""}
              aria-pressed={sort === k}
              onClick={() => setSort(k)}
            >
              {k === "new" ? b.sortNew : k === "top" ? b.sortTop : b.sortOld}
            </button>
          ))}
        </div>
      )}

      {failed ? (
        <p class="muted">{b.failed}</p>
      ) : list === null ? (
        <p class="muted">{b.loading}</p>
      ) : roots.length === 0 ? (
        <p class="muted">{b.noComments}</p>
      ) : (
        <ul class="cl">{roots.map((c) => node(c, 0))}</ul>
      )}
      {banning && <BanDialog c={banning} l={l} onClose={() => setBanning(null)} />}
    </section>
  );
}
