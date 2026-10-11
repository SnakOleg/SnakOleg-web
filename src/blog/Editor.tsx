import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { renderPost } from "../lib/markdown";
import type { L } from "../lib/i18n";
import { api, errorText } from "./api";
import { strings } from "./strings";
import { refreshBlog, setEditorOpener, toast } from "./ui";

type Draft = {
  id: number;
  title: string;
  body: string;
  tags: string;
  cover: string;
  pinned: boolean;
  commentsOpen: boolean;
};
const EMPTY: Draft = { id: 0, title: "", body: "", tags: "", cover: "", pinned: false, commentsOpen: true };
const KEY = "snak-blog-compose";

const TOOLS: [string, string, string][] = [
  ["B", "**", "**"],
  ["I", "*", "*"],
  ["H2", "\n## ", ""],
  ["❝", "\n> ", ""],
  ["•", "\n- ", ""],
  ["</>", "`", "`"],
  ["⛓", "[", "](https://)"],
  ["🖼", "![", "](https://)"],
  ["▒", "||", "||"],
];

function Dialog({ id, l, onClose }: { id: number; l: L; onClose: () => void }) {
  const b = strings(l);
  const [d, setD] = useState<Draft | null>(id ? null : EMPTY);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) {
      try {
        const saved = localStorage.getItem(KEY);
        if (saved) setD({ ...EMPTY, ...(JSON.parse(saved) as Draft) });
      } catch {
        /* storage can be blocked */
      }
      return;
    }
    void api<{ post: Record<string, unknown> }>(`/api/blog/compose?id=${id}`).then((r) => {
      if (!r.ok) {
        toast(errorText(r.data, b.errors));
        return onClose();
      }
      const p = r.data.post;
      setD({
        id,
        title: String(p.title),
        body: String(p.body),
        tags: ((p.tags as string[]) ?? []).join(", "),
        cover: String(p.cover ?? ""),
        pinned: !!p.pinned,
        commentsOpen: !!p.comments_open,
      });
    });
  }, [id]);

  useEffect(() => {
    if (!d || id) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch {
      /* ignore */
    }
  }, [d, id]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, []);

  const html = useMemo(() => (d && preview ? renderPost(d.body).html : ""), [d?.body, preview]);
  if (!d) return null;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD({ ...d, [k]: v });

  const wrap = (a: string, z: string) => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    set("body", value.slice(0, s) + a + (value.slice(s, e) || "текст") + z + value.slice(e));
    requestAnimationFrame(() => el.focus());
  };

  const save = async (status: "published" | "draft") => {
    if (!d.title.trim()) return toast(b.edNeedTitle);
    setBusy(true);
    const r = await api("/api/blog/compose", "POST", {
      id: d.id || undefined,
      title: d.title,
      body: d.body,
      tags: d.tags.split(/[,\s]+/).filter(Boolean),
      cover: d.cover,
      pinned: d.pinned,
      commentsOpen: d.commentsOpen,
      status,
    });
    setBusy(false);
    if (!r.ok) return toast(errorText(r.data, b.errors));
    if (!id) {
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
    }
    toast(status === "draft" ? b.edDraftNote : b.edSaved);
    refreshBlog();
    onClose();
  };

  return (
    <div class="modback ed" role="dialog" aria-modal="true" aria-label={b.newPost}>
      <div class="edbox">
        <header>
          <h2>{d.id ? b.editPost : b.newPost}</h2>
          <button type="button" class="act" aria-label={b.cancel} onClick={onClose}>
            ✕
          </button>
        </header>
        <div class="edfields">
          <label class="wide">
            {b.edTitle}
            <input
              value={d.title}
              maxLength={120}
              onInput={(e) => set("title", (e.target as HTMLInputElement).value)}
            />
          </label>
          <label>
            {b.edTags}
            <input value={d.tags} onInput={(e) => set("tags", (e.target as HTMLInputElement).value)} />
          </label>
          <label>
            {b.edCover}
            <input value={d.cover} onInput={(e) => set("cover", (e.target as HTMLInputElement).value)} />
          </label>
        </div>
        <div class="edtabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!preview}
            class={!preview ? "on" : ""}
            onClick={() => setPreview(false)}
          >
            {b.edWrite}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={preview}
            class={preview ? "on" : ""}
            onClick={() => setPreview(true)}
          >
            {b.edPreview}
          </button>
          {!preview && (
            <span class="tools">
              {TOOLS.map(([t, a, z]) => (
                <button type="button" aria-label={t} onClick={() => wrap(a, z)}>
                  {t}
                </button>
              ))}
            </span>
          )}
        </div>
        {preview ? (
          <div class="edprev md" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <textarea
            ref={area}
            class="edarea"
            aria-label={b.edBody}
            placeholder={b.edBody}
            value={d.body}
            maxLength={30000}
            onInput={(e) => set("body", (e.target as HTMLTextAreaElement).value)}
          />
        )}
        <footer>
          <label class="chk">
            <input
              type="checkbox"
              checked={d.pinned}
              onChange={(e) => set("pinned", (e.target as HTMLInputElement).checked)}
            />
            {b.pinned}
          </label>
          <span class="sp" />
          <button type="button" class="btn ghost" disabled={busy} onClick={() => void save("draft")}>
            {b.edDraft}
          </button>
          <button
            type="button"
            class="btn"
            disabled={busy || !d.title.trim()}
            onClick={() => void save("published")}
          >
            {b.edPublish}
          </button>
        </footer>
      </div>
    </div>
  );
}

export function EditorHost({ l }: { l: L }) {
  const [id, setId] = useState<number | null>(null);
  useEffect(() => {
    setEditorOpener((x) => setId(x));
    return () => setEditorOpener(null);
  }, []);
  return id === null ? null : <Dialog id={id} l={l} onClose={() => setId(null)} />;
}
