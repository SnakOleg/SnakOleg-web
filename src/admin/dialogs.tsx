import { useEffect, useRef, useState } from "preact/hooks";

export type AskOptions = {
  title: string;
  text?: string;
  ok?: string;
  cancel?: string;
  third?: string;
  tone?: "danger" | "normal";
};
type Answer = "ok" | "cancel" | "third";
type Pending = AskOptions & { resolve: (answer: Answer) => void };
type Tone = "ok" | "error" | "info";
type ToastItem = { id: number; text: string; tone: Tone };

let openDialog: ((p: Pending) => void) | null = null;
let openToast: ((text: string, tone: Tone) => void) | null = null;

export const ask = (options: AskOptions) =>
  new Promise<Answer>((resolve) => {
    if (openDialog) openDialog({ ...options, resolve });
    else resolve("cancel");
  });

export const confirmAction = async (options: AskOptions) => (await ask(options)) === "ok";

export const toast = (text: string, tone: Tone = "ok") => openToast?.(text, tone);

export function Dialogs() {
  const [queue, setQueue] = useState<Pending[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const primary = useRef<HTMLButtonElement>(null);
  const current = queue[0];

  useEffect(() => {
    openDialog = (p) => setQueue((q) => [...q, p]);
    openToast = (text, tone) => {
      const id = Date.now() + Math.random();
      setToasts((list) => [...list, { id, text, tone }]);
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 5000);
    };
    return () => {
      openDialog = null;
      openToast = null;
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    const close = (answer: Answer) => {
      current.resolve(answer);
      setQueue((q) => q.slice(1));
    };
    primary.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close("cancel");
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [current]);

  const answer = (a: Answer) => {
    current?.resolve(a);
    setQueue((q) => q.slice(1));
  };

  return (
    <>
      {current && (
        <div class="modal" onClick={(e) => e.target === e.currentTarget && answer("cancel")}>
          <div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title">
            <h3 id="dlg-title">{current.title}</h3>
            {current.text && <p>{current.text}</p>}
            <div class="dlg-act">
              <button type="button" class="btn" onClick={() => answer("cancel")}>
                {current.cancel ?? "Отмена"}
              </button>
              {current.third && (
                <button type="button" class="btn dng" onClick={() => answer("third")}>
                  {current.third}
                </button>
              )}
              <button
                ref={primary}
                type="button"
                class={`btn ${current.tone === "danger" ? "dng" : "pri"}`}
                onClick={() => answer("ok")}
              >
                {current.ok ?? "Подтвердить"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div class="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div class={`tst ${t.tone}`}>{t.text}</div>
        ))}
      </div>
    </>
  );
}
