import { useEffect, useRef, useState } from "preact/hooks";

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const label = (v: string) =>
  new Date(v).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

type Props = { value: string; onChange: (v: string) => void; empty?: string };

export function DatePicker({ value, onChange, empty = "Сразу" }: Props) {
  const [open, setOpen] = useState(false);
  const base = value ? new Date(value) : new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("pointerdown", away);
    addEventListener("keydown", esc);
    return () => {
      removeEventListener("pointerdown", away);
      removeEventListener("keydown", esc);
    };
  }, [open]);

  const cur = value ? new Date(value) : null;
  const time = cur ? { h: cur.getHours(), m: cur.getMinutes() } : { h: 10, m: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const first = new Date(view.y, view.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => i - lead + 1);

  const pick = (d: number) => onChange(iso(new Date(view.y, view.m, d, time.h, time.m)));
  const setTime = (h: number, m: number) => {
    const d = cur ?? new Date(view.y, view.m, today.getDate());
    d.setHours((h + 24) % 24, (m + 60) % 60);
    onChange(iso(d));
  };
  const quick = (d: Date) => {
    onChange(iso(d));
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const shift = (n: number) => {
    const d = new Date(view.y, view.m + n, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div class="dp" ref={box}>
      <button type="button" class="dpbtn" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span class="dpi" aria-hidden="true">
          ▦
        </span>
        <span>{value ? label(value) : empty}</span>
        {value && (
          <span
            class="dpx"
            role="button"
            tabIndex={0}
            aria-label="Сбросить"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            onKeyDown={(e) => e.key === "Enter" && onChange("")}
          >
            ×
          </span>
        )}
      </button>
      {open && (
        <div class="dppop" role="dialog" aria-label="Выбор даты">
          <div class="dphead">
            <button type="button" class="btn" aria-label="Предыдущий месяц" onClick={() => shift(-1)}>
              ‹
            </button>
            <b>
              {MONTHS[view.m]} {view.y}
            </b>
            <button type="button" class="btn" aria-label="Следующий месяц" onClick={() => shift(1)}>
              ›
            </button>
          </div>
          <div class="dpgrid">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((w) => (
              <i>{w}</i>
            ))}
            {cells.map((d) => {
              if (d < 1 || d > days) return <span />;
              const date = new Date(view.y, view.m, d);
              const sel =
                cur && cur.getFullYear() === view.y && cur.getMonth() === view.m && cur.getDate() === d;
              return (
                <button
                  type="button"
                  class={`${sel ? "sel" : ""} ${date.getTime() === today.getTime() ? "now" : ""}`}
                  disabled={date < today}
                  onClick={() => pick(d)}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div class="dptime">
            <span>Время</span>
            <button
              type="button"
              class="btn"
              aria-label="Час меньше"
              onClick={() => setTime(time.h - 1, time.m)}
            >
              −
            </button>
            <b>{pad(time.h)}</b>:<b>{pad(time.m)}</b>
            <button
              type="button"
              class="btn"
              aria-label="Час больше"
              onClick={() => setTime(time.h + 1, time.m)}
            >
              +
            </button>
            <button type="button" class="btn" onClick={() => setTime(time.h, time.m + 15)}>
              +15 мин
            </button>
          </div>
          <div class="dpquick">
            <button type="button" class="btn" onClick={() => quick(new Date(Date.now() + 36e5))}>
              Через час
            </button>
            <button
              type="button"
              class="btn"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                d.setHours(10, 0, 0, 0);
                quick(d);
              }}
            >
              Завтра 10:00
            </button>
            <button type="button" class="btn" onClick={() => setOpen(false)}>
              Готово
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
