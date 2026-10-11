import { useEffect, useRef } from "preact/hooks";

type Day = [date: string, count: number];

type Props = {
  days: Day[];
  locale: string;
  label: (date: string, count: number) => string;
  selected?: string;
  onPick?: (date: string) => void;
};

const weekday = (date: string) => (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;

const names = (locale: string, count: number, make: (i: number) => Date, opts: Intl.DateTimeFormatOptions) =>
  Array.from({ length: count }, (_, i) => make(i).toLocaleDateString(locale, { ...opts, timeZone: "UTC" }));

export function CalendarHeat({ days, locale, label, selected, onPick }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const max = Math.max(1, ...days.map((d) => d[1]));
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));

  const columns: (Day | null)[][] = [];
  days.forEach((day, i) => {
    const w = weekday(day[0]);
    if (i === 0 || w === 0) columns.push(Array(7).fill(null));
    columns[columns.length - 1][w] = day;
  });

  const weekdays = names(locale, 7, (i) => new Date(Date.UTC(2024, 0, 1 + i)), { weekday: "short" });
  const months = names(locale, 12, (i) => new Date(Date.UTC(2024, i, 1)), { month: "short" });

  let lastMonth = -1;
  const monthLabels = columns.map((col) => {
    const first = col.find(Boolean);
    const month = first ? Number(first[0].slice(5, 7)) - 1 : -1;
    const show = first && Number(first[0].slice(8)) <= 7 && month !== lastMonth;
    if (show) lastMonth = month;
    return show ? months[month] : "";
  });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const current = el.querySelector<HTMLElement>(".sel");
    if (current) current.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    else el.scrollLeft = el.scrollWidth;
  }, [selected, days.length]);

  const template = `repeat(${columns.length}, var(--cs))`;

  return (
    <div class="cal" ref={box}>
      <div class="cal-in">
        <div class="cal-months" style={{ gridTemplateColumns: template }}>
          {monthLabels.map((m) => (
            <span>{m}</span>
          ))}
        </div>
        <div class="cal-body">
          <div class="cal-wd">
            {weekdays.map((w, i) => (
              <span>{i % 2 === 0 ? w : ""}</span>
            ))}
          </div>
          <div class="cal-grid">
            {columns.flat().map((day) => {
              if (!day) return <i class="empty" />;
              const [date, n] = day;
              const cls = `d l${level(n)}${selected === date ? " sel" : ""}`;
              return onPick ? (
                <button
                  type="button"
                  class={cls}
                  title={label(date, n)}
                  aria-label={label(date, n)}
                  onClick={() => onPick(date)}
                />
              ) : (
                <i class={cls} title={label(date, n)} />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
