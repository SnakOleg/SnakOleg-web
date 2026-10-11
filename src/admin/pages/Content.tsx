import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { snapshot } from "../../lib/github";
import { DEMO, api, when } from "../api";
import { exportAll, importAll } from "../backup";
import { takeRequested } from "../bus";
import { confirmAction, toast } from "../dialogs";
import { Field } from "../Editor";
import { leave, setGuard } from "../guard";
import { Preview } from "../Preview";
import { SECTIONS } from "../schema";
import { Card } from "../ui";

type Loaded = {
  sid: string;
  saved: boolean;
  loaded: string;
  value: any;
  version: number;
  history: { version: number; ts: number; actor: string; note?: string }[];
  id: number;
};

const noteLabel = (note?: string) => {
  if (note === "reset") return "Сброс к значениям из кода";
  if (note?.startsWith("restore:")) return `Восстановлена из v${note.slice(8)}`;
  return "Сохранение";
};

export function Content() {
  const [sid, setSid] = useState(() => takeRequested() || SECTIONS[0].id);
  const section = SECTIONS.find((s) => s.id === sid) ?? SECTIONS[0];
  const [state, setState] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [viewing, setViewing] = useState<{ version: number; json: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const load = async () => {
    const mine = sid;
    const reply = await api(`/api/admin/content?key=${mine}`);
    const value = reply.value
      ? section.toForm
        ? section.toForm(reply.value)
        : reply.value
      : section.defaults();
    setState({
      sid: mine,
      saved: Boolean(reply.saved),
      loaded: JSON.stringify(value),
      value,
      version: reply.version,
      history: reply.history,
      id: Date.now(),
    });
  };

  useEffect(() => {
    setState(null);
    setError("");
    load().catch((e: Error) => setError(e.message));
  }, [sid]);

  const ready = state !== null && state.sid === sid;
  const dirty = ready && JSON.stringify(state.value) !== state.loaded;

  const run = async (job: () => Promise<string>) => {
    setBusy(true);
    try {
      const text = await job();
      await load();
      toast(text);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const save = async (): Promise<boolean> => {
    if (!ready) return false;
    setBusy(true);
    try {
      const value = section.fromForm ? section.fromForm(state.value) : state.value;
      const reply = await api("/api/admin/content", {
        method: "PUT",
        body: { key: sid, value, base: state.version },
      });
      await load();
      toast(`Сохранено, версия ${reply.version}. Сайт обновится в течение минуты.`);
      return true;
    } catch (e) {
      toast((e as Error).message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    setGuard({ dirty, save: () => saveRef.current() });
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    addEventListener("beforeunload", warn);
    return () => {
      setGuard({ dirty: false, save: null });
      removeEventListener("beforeunload", warn);
    };
  }, [dirty]);

  const pick = (id: string) => {
    if (id !== sid) void leave().then((ok) => ok && setSid(id));
  };

  useEffect(() => {
    const onRequest = () => {
      const id = takeRequested();
      if (id) pick(id);
    };
    addEventListener("snak-section", onRequest);
    return () => removeEventListener("snak-section", onRequest);
  }, [sid, dirty]);

  const discard = () => {
    if (state) setState({ ...state, value: JSON.parse(state.loaded), id: Date.now() });
  };

  const reset = async () => {
    if (!ready) return;
    if (!state.saved) {
      setState({ ...state, value: section.defaults(), id: Date.now() });
      toast("Загружены значения из кода. Нажмите «Сохранить», если хотите зафиксировать их.", "info");
      return;
    }
    const ok = await confirmAction({
      title: "Вернуть значения из кода?",
      text: "Правки этого раздела будут удалены из базы, сайт снова покажет значения из файлов. История версий останется, откатиться можно.",
      ok: "Сбросить",
      tone: "danger",
    });
    if (!ok) return;
    await run(async () => {
      await api(`/api/admin/content?key=${sid}`, { method: "DELETE", body: { key: sid } });
      return "Раздел сброшен к значениям из кода";
    });
  };

  const restore = async (version: number) => {
    const ok = await confirmAction({
      title: `Восстановить версию ${version}?`,
      text: `Содержимое версии ${version} будет скопировано в новую версию ${(state?.version ?? 0) + 1}. Старые версии останутся в истории.`,
      ok: "Восстановить",
    });
    if (!ok) return;
    await run(async () => {
      const reply = await api("/api/admin/content", { method: "POST", body: { key: sid, version } });
      return `Восстановлено, новая версия ${reply.version}`;
    });
  };

  const view = async (version: number) => {
    try {
      const reply = await api(`/api/admin/content?key=${sid}&version=${version}`);
      setViewing({ version, json: JSON.stringify(reply.value, null, 2) });
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const onImport = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const picked = input.files?.[0];
    input.value = "";
    if (!picked) return;
    try {
      toast(`Импортировано разделов: ${await importAll(picked)}`);
      await load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const draft = useMemo(
    () => (ready ? { [sid]: section.fromForm ? section.fromForm(state.value) : state.value } : null),
    [ready, state?.value, sid],
  );

  const have = new Set((ready ? (state.value?.repos ?? []) : []).map((r: { name: string }) => r.name));
  const candidates = sid === "github" ? snapshot.repos.filter((r) => !r.fork && !have.has(r.name)) : [];

  const actions = (
    <>
      {ready && <span class="chip">{state.saved ? `версия ${state.version}` : "из кода"}</span>}
      {!DEMO && (
        <button type="button" class={`btn${preview ? " pri" : ""}`} onClick={() => setPreview(!preview)}>
          Предпросмотр
        </button>
      )}
      <button
        type="button"
        class="btn"
        disabled={busy}
        onClick={() => void reset()}
        title="Удалить правки из базы и вернуть значения из файлов"
      >
        Сбросить к коду
      </button>
    </>
  );

  return (
    <div class="editor">
      <aside class="side2">
        <nav class="sections">
          {SECTIONS.map((s) => (
            <button type="button" class={s.id === sid ? "on" : ""} onClick={() => pick(s.id)}>
              <b>{s.title}</b>
              <small>{s.hint}</small>
            </button>
          ))}
        </nav>
        <div class="backup">
          <button type="button" class="btn" onClick={() => void exportAll()}>
            Скачать копию
          </button>
          <button type="button" class="btn" onClick={() => file.current?.click()}>
            Загрузить копию
          </button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => void onImport(e)} />
        </div>
      </aside>

      <Card title={section.title} actions={actions}>
        {error && <p class="toast err">Ошибка: {error}</p>}
        {!ready ? (
          <p class="muted">Загрузка...</p>
        ) : (
          <>
            {candidates.length > 0 && (
              <div class="cand">
                <span>Добавить репозиторий из GitHub:</span>
                {candidates.map((r) => (
                  <button
                    type="button"
                    class="chip pick"
                    onClick={() =>
                      setState({
                        ...state,
                        value: {
                          ...state.value,
                          repos: [
                            ...state.value.repos,
                            {
                              name: r.name,
                              group: "web",
                              title: { ru: r.name, en: r.name },
                              desc: { ru: r.desc, en: r.desc },
                              tags: r.lang ? [r.lang] : [],
                              date: "",
                              private: false,
                            },
                          ],
                        },
                      })
                    }
                  >
                    + {r.name}
                  </button>
                ))}
              </div>
            )}
            <Field
              key={state.id}
              f={section.root}
              v={state.value}
              set={(value) => setState({ ...state, value })}
            />
            {state.history.length > 0 && (
              <details class="hist">
                <summary>История версий ({state.history.length})</summary>
                <p class="muted">
                  Каждое сохранение, восстановление и сброс создаёт новую версию, поэтому номер только растёт.
                  Восстановление не возвращает старый номер, а копирует содержимое старой версии в новую.
                  Хранятся последние 30 версий.
                </p>
                <div class="scroll">
                  <table class="tbl">
                    <tbody>
                      {state.history.map((h) => (
                        <tr>
                          <td>
                            v{h.version}
                            {state.saved && h.version === state.version && (
                              <span class="chip ok now">текущая</span>
                            )}
                          </td>
                          <td>{noteLabel(h.note)}</td>
                          <td>{when(h.ts)}</td>
                          <td class="acts">
                            {h.note !== "reset" && (
                              <button type="button" class="btn" onClick={() => void view(h.version)}>
                                Посмотреть
                              </button>
                            )}
                            {h.note !== "reset" && !(state.saved && h.version === state.version) && (
                              <button
                                type="button"
                                class="btn"
                                disabled={busy}
                                onClick={() => void restore(h.version)}
                              >
                                Восстановить
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
            {dirty && (
              <div class="dirtybar" role="status">
                <span class="dot" />
                <b>Есть несохранённые изменения</b>
                <span class="sp" />
                <button type="button" class="btn" disabled={busy} onClick={discard}>
                  Отменить
                </button>
                <button type="button" class="btn pri" disabled={busy} onClick={() => void save()}>
                  Сохранить
                </button>
              </div>
            )}
          </>
        )}
      </Card>
      {preview && <Preview draft={draft} onClose={() => setPreview(false)} />}
      {viewing && (
        <div class="modal" onClick={(e) => e.target === e.currentTarget && setViewing(null)}>
          <div class="dlg wide" role="dialog" aria-modal="true" aria-label={`Версия ${viewing.version}`}>
            <h3>Версия {viewing.version}</h3>
            <pre>{viewing.json}</pre>
            <div class="dlg-act">
              <button type="button" class="btn" onClick={() => setViewing(null)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
