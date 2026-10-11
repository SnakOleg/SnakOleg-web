import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { renderPost } from "../../lib/markdown";
import { api, when } from "../api";
import { confirmAction, toast } from "../dialogs";
import { DatePicker } from "../DatePicker";
import { Card } from "../ui";
import { useApi } from "../useApi";

type Row = {
  id: number;
  title: string;
  status: "published" | "draft";
  pinned: number;
  pub: number;
  updated: number;
  views: number;
  comments: number;
};
type Draft = {
  id: number;
  title: string;
  body: string;
  tags: string;
  cover: string;
  pinned: boolean;
  commentsOpen: boolean;
  status: "published" | "draft";
  at: string;
};

const EMPTY: Draft = {
  id: 0,
  title: "",
  body: "",
  tags: "",
  cover: "",
  pinned: false,
  commentsOpen: true,
  status: "draft",
  at: "",
};

const pad = (n: number) => String(n).padStart(2, "0");
const toLocal = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const TOOLS: [string, string, string, string][] = [
  ["B", "Жирный", "**", "**"],
  ["I", "Курсив", "*", "*"],
  ["H2", "Заголовок", "\n## ", ""],
  ["❝", "Цитата", "\n> ", ""],
  ["•", "Список", "\n- ", ""],
  ["</>", "Код", "`", "`"],
  ["⛓", "Ссылка", "[", "](https://)"],
  ["🖼", "Картинка", "![", "](https://)"],
  ["▮", "Блок кода", "\n```ts\n", "\n```\n"],
  ["💡", "Врезка", "\n> [!TIP]\n> ", ""],
  ["▒", "Спойлер", "||", "||"],
];
const KEY = "snak-blog-draft";

function Editor({ id, onClose }: { id: number; onClose: () => void }) {
  const [d, setD] = useState<Draft | null>(id ? null : EMPTY);
  const [saving, setSaving] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) {
      try {
        const saved = localStorage.getItem(KEY);
        if (saved) setD({ ...EMPTY, ...(JSON.parse(saved) as Draft) });
      } catch {
        /* storage may be blocked */
      }
      return;
    }
    api<{ post: Record<string, unknown> }>(`/api/admin/blog?id=${id}`).then(
      ({ post: p }) =>
        setD({
          id,
          title: String(p.title),
          body: String(p.body),
          tags: ((p.tags as string[]) ?? []).join(", "),
          cover: String(p.cover ?? ""),
          pinned: !!p.pinned,
          commentsOpen: !!p.comments_open,
          status: p.status === "published" ? "published" : "draft",
          at: Number(p.pub) > Date.now() ? toLocal(Number(p.pub)) : "",
        }),
      (e: Error) => toast(e.message, "error"),
    );
  }, [id]);

  useEffect(() => {
    if (!d || id) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch {
      /* ignore */
    }
  }, [d, id]);

  const preview = useMemo(() => (d ? renderPost(d.body).html : ""), [d?.body]);
  const save = async (status?: "published" | "draft") => {
    if (!d) return;
    setSaving(true);
    try {
      const at = d.at ? new Date(d.at).getTime() : null;
      await api("/api/admin/blog", {
        method: "POST",
        body: {
          id: d.id || undefined,
          title: d.title,
          body: d.body,
          tags: d.tags.split(/[,\s]+/).filter(Boolean),
          cover: d.cover,
          pinned: d.pinned,
          commentsOpen: d.commentsOpen,
          status: status ?? d.status,
          publishAt: at && at > Date.now() ? at : null,
        },
      });
      if (!id) {
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* ignore */
        }
      }
      toast(status === "published" ? "Опубликовано" : "Сохранено");
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  if (!d) return <p class="muted">Загрузка...</p>;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD({ ...d, [k]: v });
  const wrap = (a: string, b: string) => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const next = value.slice(0, s) + a + (value.slice(s, e) || "текст") + b + value.slice(e);
    set("body", next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + a.length, s + a.length + (e - s || 5));
    });
  };

  return (
    <>
      <Card
        title={d.id ? "Редактирование поста" : "Новый пост"}
        note="Пишите в Markdown: заголовки, списки, таблицы, код с подсветкой, врезки (> [!TIP]), спойлеры ||так||. Ctrl+S сохраняет. Черновик нового поста хранится в этом браузере."
        actions={
          <button type="button" class="btn" onClick={onClose}>
            ← К списку
          </button>
        }
      >
        <div class="bf">
          <label class="wide">
            Заголовок
            <input
              value={d.title}
              maxLength={120}
              onInput={(e) => set("title", (e.target as HTMLInputElement).value)}
            />
          </label>
          <label>
            Теги через запятую
            <input
              value={d.tags}
              onInput={(e) => set("tags", (e.target as HTMLInputElement).value)}
              placeholder="код, заметки"
            />
          </label>
          <label>
            Обложка (https://…)
            <input value={d.cover} onInput={(e) => set("cover", (e.target as HTMLInputElement).value)} />
          </label>
          <div class="lab">
            Когда опубликовать
            <DatePicker value={d.at} onChange={(v) => set("at", v)} />
          </div>
          <div class="checks">
            <label>
              <input
                type="checkbox"
                checked={d.pinned}
                onChange={(e) => set("pinned", (e.target as HTMLInputElement).checked)}
              />{" "}
              Закрепить
            </label>
            <label>
              <input
                type="checkbox"
                checked={d.commentsOpen}
                onChange={(e) => set("commentsOpen", (e.target as HTMLInputElement).checked)}
              />{" "}
              Комментарии
            </label>
          </div>
        </div>
        <div class="mdtools" role="toolbar" aria-label="Форматирование">
          {TOOLS.map(([ic, tip, a, b]) => (
            <button type="button" class="btn" title={tip} aria-label={tip} onClick={() => wrap(a, b)}>
              {ic}
            </button>
          ))}
        </div>
        <div class="split">
          <textarea
            ref={area}
            class="mdarea"
            aria-label="Текст поста"
            value={d.body}
            maxLength={30000}
            spellcheck
            onInput={(e) => set("body", (e.target as HTMLTextAreaElement).value)}
            placeholder="# Привет\n\nПервый пост..."
          />
          <div class="mdprev blog">
            <div class="md" dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
        </div>
        <div class="acts bar">
          <span class="muted">{d.body.length} / 30000</span>
          <span class="sp" />
          <button type="button" class="btn" disabled={saving} onClick={() => void save("draft")}>
            В черновики
          </button>
          <button
            type="button"
            class="btn pri"
            disabled={saving || !d.title.trim()}
            onClick={() => void save("published")}
          >
            {d.at ? "Запланировать" : "Опубликовать"}
          </button>
        </div>
      </Card>
    </>
  );
}

export function Blog() {
  const [tick, setTick] = useState(0);
  const [edit, setEdit] = useState<number | null>(null);
  const data = useApi<{ posts: Row[]; now: number }>(edit === null ? `/api/admin/blog?t=${tick}` : null);

  if (edit !== null)
    return (
      <Editor
        id={edit}
        onClose={() => {
          setEdit(null);
          setTick((n) => n + 1);
        }}
      />
    );
  if (!data.data) return <p class="muted">{data.error || "Загрузка..."}</p>;
  const { posts, now } = data.data;

  const remove = async (p: Row) => {
    if (
      !(await confirmAction({
        title: "Удалить пост?",
        text: `«${p.title}» и все комментарии к нему.`,
        ok: "Удалить",
        tone: "danger",
      }))
    )
      return;
    try {
      await api("/api/admin/blog", { method: "POST", body: { action: "delete", id: p.id } });
      toast("Удалено");
      setTick((n) => n + 1);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <Card
      title="Посты мини-блога"
      note="Блог: ваша личная лента. Посты пишутся в Markdown, могут быть закреплены, отложены на дату и открыты или закрыты для комментариев."
      actions={
        <>
          <a class="btn" href="/blog" target="_blank" rel="noopener">
            Открыть блог
          </a>
          <button type="button" class="btn pri" onClick={() => setEdit(0)}>
            Новый пост
          </button>
        </>
      }
    >
      {posts.length ? (
        <ul class="plist">
          {posts.map((p) => {
            const state = p.status === "draft" ? "черновик" : p.pub > now ? "запланирован" : "опубликован";
            return (
              <li class="brow">
                <div class="meta">
                  <b>
                    {p.pinned ? "📌 " : ""}
                    {p.title}
                  </b>
                  <p class="muted">
                    <span
                      class={`chip ${state === "опубликован" ? "ok" : state === "черновик" ? "mute" : "info"}`}
                    >
                      {state}
                    </span>{" "}
                    {when(p.pub)} · {p.views} просмотров · {p.comments} комментариев
                  </p>
                </div>
                <div class="acts">
                  <button type="button" class="btn" onClick={() => setEdit(p.id)}>
                    Править
                  </button>
                  <button type="button" class="btn dng" onClick={() => void remove(p)}>
                    Удалить
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p class="muted">Постов пока нет. Нажмите «Новый пост».</p>
      )}
    </Card>
  );
}
