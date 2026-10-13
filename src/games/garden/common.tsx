import { H, W, rnd } from "./world";
import type { Season } from "./world";

const FLOWERS = ["#f7d44c", "#f28bb0", "#ffffff", "#9b7fd6", "#ff8a5b"];

export function Hills({ top, seed = 0 }: { top: number; seed?: number }) {
  const a = 40 + seed * 13;
  return (
    <>
      <path
        d={`M0 ${top - 50}Q${160 + a} ${top - 150} ${330 + a} ${top - 80}T${660 + a} ${top - 100}T${980 - a} ${top - 74}T1200 ${top - 126}V${top + 60}H0z`}
        class="far"
      />
      <path
        d={`M0 ${top - 14}Q${220 - a} ${top - 78} 470 ${top - 40}T880 ${top - 36}T1200 ${top - 30}V${top + 80}H0z`}
        class="hill"
      />
    </>
  );
}

export function Pines({ y, n = 42, h = 26, seed = 0 }: { y: number; n?: number; h?: number; seed?: number }) {
  const step = W / n;
  return (
    <g class="pines">
      {Array.from({ length: n }, (_, i) => {
        const x = i * step + Math.round(rnd(i + seed) * 14);
        const t = h + Math.round(rnd(i + 40 + seed) * h);
        return <path key={i} d={`M${x} ${y}l-${t * 0.38} 0l${t * 0.38} -${t}l${t * 0.38} ${t}z`} />;
      })}
    </g>
  );
}

export function Meadow({ top }: { top: number }) {
  return (
    <>
      <rect y={top} width={W} height={H - top} class="meadow" />
      <ellipse cx="320" cy={top + 130} rx="420" ry="46" class="mow" />
      <ellipse cx="860" cy={top + 220} rx="460" ry="52" class="mow" />
      <ellipse cx="420" cy={top + 360} rx="520" ry="60" class="mow" />
    </>
  );
}

export function Tufts({ top, n = 90, seed = 0 }: { top: number; n?: number; seed?: number }) {
  return (
    <g class="tufts">
      {Array.from({ length: n }, (_, i) => {
        const x = Math.round(rnd(i + 3 + seed) * W);
        const y = Math.round(top + 50 + rnd(i + 91 + seed) * (H - top - 60));
        const s = 0.6 + rnd(i + 7 + seed) * 0.8;
        return <path key={i} d={`M${x} ${y}l-4 -${9 * s}M${x} ${y}l1 -${12 * s}M${x} ${y}l5 -${8 * s}`} />;
      })}
    </g>
  );
}

export function Wild({ top, n = 64, seed = 0 }: { top: number; n?: number; seed?: number }) {
  return (
    <g class="wild">
      {Array.from({ length: n }, (_, i) => {
        const x = Math.round(rnd(i + 200 + seed) * W);
        const y = Math.round(top + 60 + rnd(i + 301 + seed) * (H - top - 80));
        const s = 0.7 + rnd(i + 5 + seed) * 0.6;
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            <path d="M0 0v-10" />
            <circle cy="-12" r="3.6" fill={FLOWERS[i % FLOWERS.length]} />
            <circle cy="-12" r="1.4" class="eye" />
          </g>
        );
      })}
    </g>
  );
}

export function Rocks({ list }: { list: [number, number, number][] }) {
  return (
    <g class="rocks">
      {list.map(([x, y, r], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx={r} ry={r * 0.6} />
          <ellipse cx={x - r * 0.3} cy={y - r * 0.2} rx={r * 0.4} ry={r * 0.22} class="hi" />
        </g>
      ))}
    </g>
  );
}

export function Windmill({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} class="mill">
      <path d="M-14 46l7 -50h14l7 50z" class="wood" />
      <path d="M-9 -4h18l-9 -12z" class="roof" />
      <rect x="-4" y="30" width="8" height="16" rx="3" class="door" />
      <g class="blades">
        <path d="M0 -6L-4 -52M0 -6L52 -2M0 -6L4 42M0 -6L-48 -2" />
        <path d="M-4 -52l-12 4M52 -2l-2 12M4 42l12 -4M-48 -2l2 -12" class="sail" />
      </g>
      <circle cy="-6" r="3.4" class="hub" />
    </g>
  );
}

export function Cottage({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} class="cottage">
      <rect x="-44" y="-44" width="88" height="46" class="wall" />
      <path d="M-54 -42l54 -34l54 34z" class="roof" />
      <rect x="22" y="-76" width="10" height="22" class="chim" />
      <rect x="-9" y="-30" width="18" height="32" rx="3" class="door" />
      <rect x="-36" y="-32" width="16" height="14" rx="2" class="win" />
      <rect x="20" y="-32" width="16" height="14" rx="2" class="win" />
      <g class="smoke">
        <circle cx="27" cy="-84" r="5" />
        <circle cx="27" cy="-84" r="5" style={{ animationDelay: "1.6s" }} />
        <circle cx="27" cy="-84" r="5" style={{ animationDelay: "3.2s" }} />
      </g>
    </g>
  );
}

export function Tree({ x, y, s = 1, swing = false }: { x: number; y: number; s?: number; swing?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} class="oak">
      <path d="M-14 0Q-10 -60 -22 -118h44Q10 -60 14 0z" class="trunk" />
      <circle cx="-48" cy="-130" r="44" class="crown dark" />
      <circle cx="46" cy="-134" r="42" class="crown dark" />
      <circle cx="0" cy="-158" r="54" class="crown" />
      <circle cx="-30" cy="-122" r="36" class="crown" />
      <circle cx="34" cy="-120" r="34" class="crown" />
      <circle cx="-8" cy="-176" r="22" class="crown light" />
      {swing && (
        <>
          <path d="M-40 -106h-14" class="branch" />
          <g transform="translate(-46 -108)">
            <g class="swing">
              <path d="M0 0L-12 66M0 0L12 66" />
              <rect x="-18" y="64" width="36" height="6" rx="2" class="seat" />
            </g>
          </g>
        </>
      )}
    </g>
  );
}

export function Fruit({ x, y, s = 1, seed = 0 }: { x: number; y: number; s?: number; seed?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} class="fruit">
      <path d="M-6 0Q-4 -30 -8 -52h16Q4 -30 6 0z" class="trunk" />
      <circle cx="0" cy="-70" r="34" class="crown" />
      <circle cx="-24" cy="-56" r="22" class="crown dark" />
      <circle cx="24" cy="-58" r="22" class="crown dark" />
      {Array.from({ length: 7 }, (_, i) => (
        <circle key={i} cx={-24 + rnd(i + seed) * 48} cy={-86 + rnd(i + seed + 9) * 40} r="4" class="apple" />
      ))}
    </g>
  );
}

export function Fence({
  y,
  from = 0,
  to = W,
  gap,
}: {
  y: number;
  from?: number;
  to?: number;
  gap?: [number, number];
}) {
  const pickets = [];
  for (let x = from + 6; x < to; x += 26) if (!gap || x < gap[0] || x > gap[1]) pickets.push(x);
  const segs = gap
    ? [
        [from, gap[0]],
        [gap[1], to],
      ]
    : [[from, to]];
  const d = [y - 22, y - 8].flatMap((yy) => segs.map(([a, b]) => `M${a} ${yy}H${b}`)).join("");
  return (
    <g class="fence">
      <path d={d} class="rail" />
      {pickets.map((px) => (
        <path key={px} d={`M${px - 5} ${y + 6}V${y - 28}l5 -6l5 6V${y + 6}z`} class="picket" />
      ))}
    </g>
  );
}

export function Arch({ x, y }: { x: number; y: number }) {
  return (
    <g class="fence">
      <path d={`M${x - 44} ${y + 6}V${y - 58}Q${x} ${y - 98} ${x + 44} ${y - 58}V${y + 6}`} class="arch" />
      {Array.from({ length: 9 }, (_, i) => (
        <circle
          key={i}
          cx={x - 40 + i * 10.5}
          cy={y - 62 - Math.sin((i / 8) * Math.PI) * 30}
          r={3.4 + (i % 3)}
          class={i % 3 === 0 ? "rose" : i % 3 === 1 ? "rose pink" : "leafy"}
        />
      ))}
    </g>
  );
}

export function Bench({ x, y, cat = false }: { x: number; y: number; cat?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} class="bench">
      <rect x="-44" y="-30" width="88" height="6" rx="2" />
      <rect x="-44" y="-18" width="88" height="6" rx="2" />
      <path d="M-36 -42h72v8h-72z" />
      <path d="M-38 -12v12M38 -12v12" class="leg" />
      {cat && (
        <g class="cat" transform="translate(14 -34)">
          <ellipse rx="13" ry="7" />
          <circle cx="-12" cy="-4" r="6" />
          <path d="M-16 -9l2 -6l4 4zM-9 -10l4 -5l2 6z" />
          <path d="M12 -2q10 -2 8 -10" class="tail" />
          <text x="-6" y="-16" class="zzz">
            z
          </text>
        </g>
      )}
    </g>
  );
}

export function Lamp({ x, y, lit }: { x: number; y: number; lit: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} class="lamp">
      <path d="M0 0V-80" class="post" />
      <path d="M-9 -80h18l-3 -14h-12z" class="head" />
      <rect x="-5" y="-92" width="10" height="12" rx="3" class={lit ? "bulb on" : "bulb"} />
    </g>
  );
}

export const Glow = ({ x, y, r = 54 }: { x: number; y: number; r?: number }) => (
  <circle cx={x} cy={y} r={r} class="glow" />
);

export function Bush({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`} class="bush">
      <circle r="34" />
      <circle r="26" cx="34" cy="10" />
      <circle r="5" cx="-8" cy="-12" class="berry" />
      <circle r="5" cx="14" cy="-4" class="berry" />
      <circle r="5" cx="30" cy="2" class="berry" />
    </g>
  );
}

export function Critters({ night }: { night: boolean }) {
  return night ? (
    <>
      {Array.from({ length: 22 }, (_, i) => (
        <circle
          key={i}
          class="firefly"
          cx={60 + Math.round(rnd(i + 11) * 1080)}
          cy={420 + Math.round(rnd(i + 51) * 340)}
          r="2.4"
          style={{ animationDelay: `${(i % 8) * 0.7}s`, animationDuration: `${5 + (i % 4)}s` }}
        />
      ))}
    </>
  ) : (
    <>
      {Array.from({ length: 4 }, (_, i) => (
        <g key={i} class={`fly f${i}`}>
          <path d="M0 0q-8 -9 -12 -2q-2 7 12 2zM0 0q8 -9 12 -2q2 7 -12 2z" />
        </g>
      ))}
      {Array.from({ length: 2 }, (_, i) => (
        <g key={i} class={`bee b${i}`}>
          <ellipse rx="4.4" ry="3" />
          <path d="M-1 -3v6M2 -3v6" class="stripe" />
          <ellipse cx="-1" cy="-4" rx="3" ry="1.6" class="wing" />
        </g>
      ))}
      {Array.from({ length: 3 }, (_, i) => (
        <path key={i} class={`bird h${i}`} d="M0 0q6 -7 12 0q6 -7 12 0" />
      ))}
    </>
  );
}

// Falling leaves in autumn, snow in winter, petals in spring, rain when the garden event says so.
export function Particles({ season, rain }: { season: Season; rain: boolean }) {
  if (rain)
    return (
      <g class="rainfall">
        {Array.from({ length: 70 }, (_, i) => (
          <path
            key={i}
            d={`M${Math.round(rnd(i + 70) * W)} ${-20 - Math.round(rnd(i + 3) * 300)}l-6 18`}
            style={{ animationDelay: `${-rnd(i + 9) * 1.2}s` }}
          />
        ))}
      </g>
    );
  if (season === "summer") return null;
  return (
    <g class={`fall ${season}`}>
      {Array.from({ length: season === "winter" ? 60 : 22 }, (_, i) => (
        <g key={i} transform={`translate(${Math.round(rnd(i + 31) * W)} -20)`}>
          <g style={{ animationDelay: `${-rnd(i + 17) * 14}s`, animationDuration: `${10 + rnd(i) * 8}s` }}>
            {season === "autumn" ? (
              <path d="M0 0q6 -6 12 0q-6 6 -12 0z" class={i % 2 ? "lf a" : "lf b"} />
            ) : season === "winter" ? (
              <circle r={1.6 + rnd(i + 4) * 2.4} class="flake" />
            ) : (
              <ellipse rx="4" ry="2.4" class="petalf" />
            )}
          </g>
        </g>
      ))}
    </g>
  );
}

// A can that tilts towards the plant: the spout is on the left, the handle on the right.
export function Can({ x, y, k, fall }: { x: number; y: number; k: number; fall: number }) {
  return (
    <g class="can" style={{ "--cx": `${x}px`, "--cy": `${y}px`, "--k": k, "--fall": `${fall}px` }}>
      <g class="canfly">
        <g class="cantilt">
          <path d="M-25 -2L-50.5 -24L-55.5 -18L-25 14z" class="canspout" />
          <path d="M-49.4 -29.8L-44.8 -25.9L-56.6 -12.3L-61.2 -16.2z" class="canrose" />
          <path d="M-26 -16H24L29 22Q29 30 21 30H-19Q-27 30 -27 22z" class="canbody" />
          <ellipse cx="-1" cy="-16" rx="25" ry="4" class="canrim" />
          <path d="M-18 -4V22" class="cangloss" />
          <path d="M26 -10q28 -4 26 16q-2 16 -22 12" class="canhandle" />
          <path d="M-14 -17q-2 -14 14 -20q16 6 14 20" class="canhandle thin" />
        </g>
        {Array.from({ length: 12 }, (_, i) => (
          <circle
            key={i}
            cx={-58 + (i % 4) * 3}
            cy={22}
            r="2.2"
            class="drop"
            style={{ animationDelay: `${1.4 + i * 0.05}s` }}
          />
        ))}
      </g>
    </g>
  );
}
