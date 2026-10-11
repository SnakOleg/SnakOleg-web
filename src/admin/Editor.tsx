import { useState } from "preact/hooks";
import { confirmAction } from "./dialogs";
import { F, defaultOf } from "./schema";

type P = { f: F; v: any; set: (v: any) => void; label?: string };
const tv = (v: any) => (typeof v === "string" ? { ru: v, en: v } : (v ?? { ru: "", en: "" }));
const val = (e: Event) => (e.target as HTMLInputElement).value;

function Tags({ v, set, label }: { v: string[]; set: (v: string[]) => void; label?: string }) {
  const [txt, setTxt] = useState((v ?? []).join(", "));
  return (
    <input
      aria-label={label}
      value={txt}
      onInput={(e) => {
        setTxt(val(e));
        set(
          val(e)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }}
    />
  );
}

export function Field({ f, v, set, label }: P) {
  switch (f.t) {
    case "text":
      return <input aria-label={label} value={v ?? ""} placeholder={f.ph} onInput={(e) => set(val(e))} />;
    case "area":
      return <textarea aria-label={label} rows={3} value={v ?? ""} onInput={(e) => set(val(e))} />;
    case "i18n":
    case "i18na": {
      const x = tv(v);
      return (
        <div class="i18n">
          {(["ru", "en"] as const).map((l) => (
            <label>
              <span>{l}</span>
              {f.t === "i18n" ? (
                <input
                  aria-label={`${label ?? ""} (${l})`}
                  value={x[l]}
                  onInput={(e) => set({ ...x, [l]: val(e) })}
                />
              ) : (
                <textarea
                  aria-label={`${label ?? ""} (${l})`}
                  rows={4}
                  value={x[l]}
                  onInput={(e) => set({ ...x, [l]: val(e) })}
                />
              )}
            </label>
          ))}
        </div>
      );
    }
    case "tags":
      return <Tags v={v} set={set} label={label} />;
    case "num":
      return <input aria-label={label} type="number" value={v ?? 0} onInput={(e) => set(Number(val(e)))} />;
    case "bool":
      return (
        <label class="chk">
          <input
            aria-label={label}
            type="checkbox"
            checked={!!v}
            onChange={(e) => set((e.target as HTMLInputElement).checked)}
          />{" "}
          да
        </label>
      );
    case "select":
      return (
        <select aria-label={label} value={v} onChange={(e) => set(val(e))}>
          {f.opts!.map((o) => (
            <option value={o}>{o}</option>
          ))}
        </select>
      );
    case "obj":
      return (
        <div class="obj">
          {f.fields!.map((c) => (
            <div class={"row " + c.t}>
              <label>{c.l}</label>
              <Field f={c} label={c.l} v={v?.[c.k!]} set={(nv) => set({ ...v, [c.k!]: nv })} />
            </div>
          ))}
        </div>
      );
    case "list": {
      const arr: any[] = v ?? [];
      const removeAt = async (i: number) => {
        const ok = await confirmAction({
          title: "Удалить элемент?",
          text: "Он пропадёт из списка после сохранения.",
          ok: "Удалить",
          tone: "danger",
        });
        if (ok) set(arr.filter((_, j) => j !== i));
      };
      const move = (i: number, d: number) => {
        const n = [...arr];
        const [x] = n.splice(i, 1);
        n.splice(i + d, 0, x);
        set(n);
      };
      const btn = (t: string, fn: () => void, off = false, name = "") => (
        <button
          type="button"
          class="ico"
          aria-label={name}
          title={name}
          disabled={off}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            fn();
          }}
        >
          {t}
        </button>
      );
      const simple = f.of!.t !== "obj";
      return (
        <div class="list">
          {arr.map((it, i) =>
            simple ? (
              <div class="inl">
                <Field
                  f={f.of!}
                  label={label}
                  v={it}
                  set={(nv) => {
                    const n = [...arr];
                    n[i] = nv;
                    set(n);
                  }}
                />
                {btn("↑", () => move(i, -1), i === 0, "Вверх")}
                {btn("↓", () => move(i, 1), i === arr.length - 1, "Вниз")}
                {btn("✕", () => set(arr.filter((_, j) => j !== i)), false, "Удалить")}
              </div>
            ) : (
              <details class="item">
                <summary>
                  <b>{f.sum?.(it) || `#${i + 1}`}</b>
                  <span class="act">
                    {btn("↑", () => move(i, -1), i === 0, "Вверх")}
                    {btn("↓", () => move(i, 1), i === arr.length - 1, "Вниз")}
                    {btn("✕", () => void removeAt(i), false, "Удалить")}
                  </span>
                </summary>
                <Field
                  f={f.of!}
                  v={it}
                  set={(nv) => {
                    const n = [...arr];
                    n[i] = nv;
                    set(n);
                  }}
                />
              </details>
            ),
          )}
          <button type="button" class="btn add" onClick={() => set([...arr, defaultOf(f.of!)])}>
            + Добавить
          </button>
        </div>
      );
    }
  }
}
