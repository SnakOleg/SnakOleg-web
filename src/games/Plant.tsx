import type { ComponentChildren } from "preact";
import type { Plant as Kind } from "../../shared/garden";

const POT = (
  <>
    <path d="M19 46h26l-3.5 14h-19z" class="pot" />
    <path d="M17 44h30v4H17z" class="pot rim" />
  </>
);

const leaf = (x: number, y: number, flip: 1 | -1, s = 1) => (
  <path d={`M${x} ${y}q${10 * flip * s} -2 ${12 * flip * s} -10q-10 0 -${12 * flip * s} 10z`} class="leaf" />
);

const stem = (top: number) => <path d={`M32 44V${top}`} class="stem" />;

const petals = (cx: number, cy: number, r: number, n: number) =>
  Array.from({ length: n }, (_, i) => (
    <ellipse
      cx={cx}
      cy={cy - r}
      rx={r * 0.38}
      ry={r * 0.62}
      class="petal"
      transform={`rotate(${(360 / n) * i} ${cx} ${cy})`}
    />
  ));

const SEED = <ellipse cx="32" cy="43" rx="5" ry="2.4" class="soil" />;

const DRAW: Record<Kind, (stage: number) => ComponentChildren> = {
  tulip: (s) => {
    if (s === 0) return SEED;
    const top = 44 - [0, 8, 18, 26, 30][s]!;
    return (
      <>
        {stem(top)}
        {s >= 1 && leaf(32, 42, -1, s > 1 ? 1.2 : 0.8)}
        {s >= 2 && leaf(32, 38, 1, 1.2)}
        {s === 3 && <ellipse cx="32" cy={top - 3} rx="3.5" ry="5" class="bud" />}
        {s === 4 && <path d={`M24 ${top - 9}q0 12 8 12q8 0 8 -12l-4 4l-4 -6l-4 6z`} class="tulip" />}
      </>
    );
  },
  sunflower: (s) => {
    if (s === 0) return SEED;
    const top = 44 - [0, 8, 18, 26, 30][s]!;
    return (
      <>
        {stem(top)}
        {leaf(32, 42, -1, s > 1 ? 1.3 : 0.8)}
        {s >= 2 && leaf(32, 36, 1, 1.3)}
        {s === 3 && <circle cx="32" cy={top - 2} r="4.5" class="bud" />}
        {s === 4 && (
          <>
            {petals(32, top - 6, 11, 10)}
            <circle cx="32" cy={top - 6} r="5.2" class="core" />
          </>
        )}
      </>
    );
  },
  cactus: (s) => {
    if (s === 0) return SEED;
    const h = [0, 8, 16, 22, 26][s]!;
    return (
      <>
        <rect x="26" y={44 - h} width="12" height={h} rx="6" class="cactus" />
        {s >= 3 && <path d="M26 36h-4a3 3 0 0 1 -3 -3v-5" class="arm" />}
        {s >= 3 && <path d="M38 32h4a3 3 0 0 0 3 -3v-5" class="arm" />}
        {s === 4 && <circle cx="32" cy={44 - h - 1} r="3.6" class="bloom" />}
      </>
    );
  },
  tree: (s) => {
    if (s === 0) return SEED;
    const top = 44 - [0, 8, 14, 20, 24][s]!;
    const r = [0, 5, 8, 11, 13][s]!;
    return (
      <>
        <path d={`M32 44V${top}`} class="trunk" />
        <circle cx="32" cy={top - r * 0.6} r={r} class="crown" />
        {s >= 3 && <circle cx={32 - r * 0.7} cy={top - r * 0.2} r={r * 0.65} class="crown" />}
        {s >= 3 && <circle cx={32 + r * 0.7} cy={top - r * 0.2} r={r * 0.65} class="crown" />}
        {s === 4 && (
          <>
            <circle cx="27" cy={top - 9} r="1.8" class="bloom" />
            <circle cx="36" cy={top - 12} r="1.8" class="bloom" />
            <circle cx="33" cy={top - 4} r="1.8" class="bloom" />
            <circle cx="24" cy={top - 2} r="1.8" class="bloom" />
            <circle cx="40" cy={top - 3} r="1.8" class="bloom" />
          </>
        )}
      </>
    );
  },
  mushroom: (s) => {
    if (s === 0) return SEED;
    const h = [0, 4, 8, 10, 12][s]!;
    const w = [0, 6, 10, 13, 15][s]!;
    return (
      <>
        <rect x="29" y={44 - h} width="6" height={h} rx="2" class="foot" />
        <path
          d={`M${32 - w} ${44 - h}a${w} ${w * 0.85} 0 0 1 ${w * 2} 0z`}
          class={s === 4 ? "cap hot" : "cap"}
        />
        {s === 4 && (
          <>
            <circle cx="27" cy={44 - h - 5} r="1.8" class="dot" />
            <circle cx="35" cy={44 - h - 8} r="2.2" class="dot" />
            <circle cx="39" cy={44 - h - 3} r="1.5" class="dot" />
          </>
        )}
      </>
    );
  },
};

export function PlantArt({
  kind,
  stage,
  label,
  pot = true,
  delay = 0,
}: {
  kind: Kind;
  stage: number;
  label: string;
  pot?: boolean;
  delay?: number;
}) {
  return (
    <svg class={`plant s${stage}`} viewBox="0 0 64 64" role="img" aria-label={label}>
      <g class="sway" style={{ animationDelay: `${-delay}s` }}>
        {(DRAW[kind] ?? DRAW.tulip)(Math.min(4, Math.max(0, stage)))}
      </g>
      {pot && POT}
    </svg>
  );
}
