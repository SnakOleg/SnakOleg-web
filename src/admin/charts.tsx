import { useState } from "preact/hooks";
import type { Point } from "./api";
import { dm, shortDay } from "./api";
import { Note } from "./ui";

type KpiProps = { label: string; value: string | number; sub?: string; note?: string; spark?: number[] };

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map(
    (v, i) => `${((i / (values.length - 1)) * 96).toFixed(1)},${(26 - (v / max) * 22).toFixed(1)}`,
  );
  return (
    <svg class="spark" viewBox="0 0 96 28" aria-hidden="true">
      <polyline points={pts.join(" ")} />
    </svg>
  );
}

export const Kpi = ({ label, value, sub, note, spark }: KpiProps) => (
  <div class="card kpi">
    <span>
      {label}
      {note && <Note text={note} />}
    </span>
    <b>{typeof value === "number" ? value.toLocaleString("ru-RU") : value}</b>
    {sub && <small>{sub}</small>}
    {spark && <Spark values={spark} />}
  </div>
);

function curve(points: [number, number][]) {
  const n = points.length;
  const f = (v: number) => v.toFixed(1);
  if (n < 3) return points.map((p, i) => `${i ? "L" : "M"}${f(p[0])} ${f(p[1])}`).join("");
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1][0] - points[i][0];
    m[i] = (points[i + 1][1] - points[i][1]) / dx[i];
  }
  const t = [
    m[0],
    ...Array.from({ length: n - 2 }, (_, i) => (m[i] * m[i + 1] <= 0 ? 0 : (m[i] + m[i + 1]) / 2)),
    m[n - 2],
  ];
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${f(points[i][0] + h)} ${f(points[i][1] + t[i] * h)} ${f(points[i + 1][0] - h)} ${f(points[i + 1][1] - t[i + 1] * h)} ${f(points[i + 1][0])} ${f(points[i + 1][1])}`;
  }
  return d;
}

const STEPS = [4, 8, 10, 20, 40, 50, 100, 200, 400, 500, 1000];
const niceMax = (max: number) => STEPS.find((s) => s >= max) ?? Math.ceil(max / 1000) * 1000;

type TrendProps = { data: Point[]; today?: string; selected?: string; onPick?: (day: string) => void };

export function TrendChart({ data, today, selected, onPick }: TrendProps) {
  const [hover, setHover] = useState(-1);
  const W = 720;
  const H = 240;
  const M = { l: 34, r: 12, t: 12, b: 26 };
  const top = niceMax(Math.max(1, ...data.map((d) => d.views)));
  const x = (i: number) =>
    M.l + (data.length > 1 ? (i * (W - M.l - M.r)) / (data.length - 1) : (W - M.l - M.r) / 2);
  const y = (v: number) => M.t + (H - M.t - M.b) * (1 - v / top);
  const views = curve(data.map((d, i) => [x(i), y(d.views)]));
  const visitors = curve(data.map((d, i) => [x(i), y(d.visitors)]));
  const area = `${views}L${x(data.length - 1).toFixed(1)} ${y(0)}L${x(0).toFixed(1)} ${y(0)}Z`;
  const step = Math.ceil(data.length / 7);
  const active = hover >= 0 ? hover : data.findIndex((d) => d.day === selected);
  const current = hover >= 0 ? data[hover] : null;

  const move = (e: PointerEvent) => {
    const box = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * (W - M.l - M.r);
    setHover(
      Math.max(
        0,
        Math.min(data.length - 1, Math.round(px / ((W - M.l - M.r) / Math.max(1, data.length - 1)))),
      ),
    );
  };

  const shift = hover < data.length * 0.18 ? "0%" : hover > data.length * 0.82 ? "-100%" : "-50%";

  return (
    <div class="trend">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="График просмотров и посетителей">
        <defs>
          <linearGradient id="trendfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--acc)" stop-opacity=".22" />
            <stop offset="1" stop-color="var(--acc)" stop-opacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((r) => (
          <g>
            <line class="gl" x1={M.l} x2={W - M.r} y1={y(top * r)} y2={y(top * r)} />
            <text class="ax" x={M.l - 8} y={y(top * r) + 3} text-anchor="end">
              {Math.round(top * r)}
            </text>
          </g>
        ))}
        <path class="area" d={area} />
        <path class="visitors" d={visitors} />
        <path class="views" d={views} />
        {data.map((d, i) =>
          i % step === 0 || (i === data.length - 1 && i % step >= Math.ceil(step / 2)) ? (
            <text
              class={`ax${d.day === today ? " now" : ""}`}
              x={x(i)}
              y={H - 8}
              text-anchor={i === data.length - 1 ? "end" : "middle"}
            >
              {dm(d.day)}
            </text>
          ) : null,
        )}
        {active >= 0 && (
          <g>
            <line class="cross" x1={x(active)} x2={x(active)} y1={M.t} y2={H - M.b} />
            <circle class="pt visitors" cx={x(active)} cy={y(data[active].visitors)} r="3.5" />
            <circle class="pt views" cx={x(active)} cy={y(data[active].views)} r="4.5" />
          </g>
        )}
        <rect
          class="hit"
          x={M.l}
          y={M.t}
          width={W - M.l - M.r}
          height={H - M.t - M.b}
          onPointerMove={move}
          onPointerLeave={() => setHover(-1)}
          onClick={() => hover >= 0 && onPick?.(data[hover].day)}
        />
      </svg>
      {current && (
        <div class="tipbox" style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${shift})` }}>
          <b>{shortDay(current.day)}</b>
          <span>
            <i class="d1" />
            Просмотры <em>{current.views}</em>
          </span>
          <span>
            <i class="d2" />
            Посетители <em>{current.visitors}</em>
          </span>
        </div>
      )}
      <div class="legend">
        <span class="l0">Просмотры</span>
        <span class="l1">Посетители</span>
      </div>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const BANDS: [string, number, number][] = [
  ["Ночь", 0, 6],
  ["Утро", 6, 12],
  ["День", 12, 18],
  ["Вечер", 18, 24],
];

export function HourBars({ hours }: { hours: number[] }) {
  const max = Math.max(1, ...hours);
  const peak = Math.max(...hours) > 0 ? hours.indexOf(Math.max(...hours)) : -1;
  return (
    <div class="hours">
      <div class="bands">
        {BANDS.map(([name, from, to]) => (
          <div style={{ gridColumn: `${from + 1} / ${to + 1}` }}>
            <b>{name}</b>
            <small>
              {pad(from)}:00 до {pad(to)}:00
            </small>
            <em>{hours.slice(from, to).reduce((a, b) => a + b, 0)}</em>
          </div>
        ))}
      </div>
      <div class="hbars">
        {hours.map((n, h) => (
          <div class="hb" title={`${pad(h)}:00 до ${pad(h + 1)}:00: ${n}`}>
            <i class={h === peak ? "peak" : ""} style={{ height: `${(n / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div class="hlab">
        {hours.map((_, h) => (
          <span>{pad(h)}</span>
        ))}
      </div>
      {peak >= 0 && (
        <p class="muted">
          Пик активности: {pad(peak)}:00 до {pad(peak + 1)}:00 ({hours[peak]})
        </p>
      )}
    </div>
  );
}

export function BarList({
  items,
  total,
  max: top,
}: {
  items: [string, number][];
  total?: number;
  max?: number;
}) {
  const max = top ?? Math.max(1, ...items.map((i) => i[1]));
  if (!items.length) return <p class="muted">Пока нет данных</p>;
  return (
    <ul class="bars">
      {items.map(([name, n]) => (
        <li>
          <span title={name}>{name}</span>
          <b>
            {n.toLocaleString("ru-RU")}
            {total ? <small>{Math.round((n / total) * 100)}%</small> : null}
          </b>
          <i style={{ width: `${(n / max) * 100}%` }} />
        </li>
      ))}
    </ul>
  );
}

export function Donut({ items }: { items: [string, number][] }) {
  const total = items.reduce((a, i) => a + i[1], 0);
  const R = 38;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div class="donut">
      <svg viewBox="0 0 100 100">
        <circle class="bg" cx="50" cy="50" r={R} />
        {total > 0 &&
          items.map(([, n], i) => {
            const len = (n / total) * C;
            const el = (
              <circle
                class={`sg s${i % 5}`}
                cx="50"
                cy="50"
                r={R}
                stroke-dasharray={`${len} ${C - len}`}
                stroke-dashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        <text x="50" y="54" text-anchor="middle">
          {total.toLocaleString("ru-RU")}
        </text>
      </svg>
      <ul>
        {items.map(([name, n], i) => (
          <li>
            <i class={`s${i % 5}`} />
            {name}
            <b>{total ? Math.round((n / total) * 100) : 0}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
