import { LOCS } from "../../../shared/garden";
import type { Loc } from "../../../shared/garden";
import { seasonOf } from "../../../shared/stamps";
import { dayNumber } from "../../../shared/words";
import { W, rnd } from "./world";
import type { Tone } from "./world";

// The same event for everyone on a given day, so visitors can tell each other about it.
export function gardenEvent(loc: Loc, tone: Tone, d = new Date()) {
  const holiday = seasonOf(d);
  if (holiday === "halloween" || holiday === "newyear") return holiday;
  const r = rnd(dayNumber(d.getTime()) * 31 + LOCS.indexOf(loc) * 7 + 3);
  if (r < 0.2) return d.getMonth() < 2 || d.getMonth() === 11 ? "snow" : "rain";
  if (r < 0.32 && tone !== "night" && (loc === "meadow" || loc === "orchard")) return "fair";
  if (r < 0.46) return "visitor";
  return "";
}

export function Holiday({ kind }: { kind: string }) {
  if (kind === "halloween")
    return (
      <g class="hw">
        {[
          [90, 700, 1.2],
          [1060, 640, 0.9],
          [520, 470, 0.6],
          [760, 560, 0.75],
        ].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`} class="jack">
            <ellipse cx="0" cy="-16" rx="24" ry="18" class="gourd" />
            <path d="M0 -34q2 -8 8 -10" class="stem" />
            <path
              d="M-12 -22l5 -6l5 6zM2 -22l5 -6l5 6zM-12 -10q12 8 24 0l-4 3l-4 -3l-4 3l-4 -3l-4 3z"
              class="face"
            />
          </g>
        ))}
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            class={`bat t${i}`}
            d="M0 0q-8 -10 -18 -4q6 2 6 8q4 -6 12 -4q8 -2 12 4q0 -6 6 -8q-10 -6 -18 4z"
          />
        ))}
      </g>
    );
  if (kind === "newyear")
    return (
      <g class="ny">
        <g transform="translate(1010 520)" class="fir">
          <path d="M0 -150l-40 60h20l-34 50h22l-30 44h124l-30 -44h22l-34 -50h20z" />
          <rect x="-8" y="4" width="16" height="16" class="trunk" />
          {Array.from({ length: 10 }, (_, i) => (
            <circle
              key={i}
              cx={-36 + rnd(i + 3) * 72 * (0.4 + (i / 10) * 0.6)}
              cy={-110 + i * 11}
              r="4"
              class={`ball b${i % 3}`}
            />
          ))}
          <path d="M0 -164l4 9l10 1l-8 6l3 10l-9 -6l-9 6l3 -10l-8 -6l10 -1z" class="star" />
        </g>
        <g transform="translate(160 720)" class="snowman">
          <circle cy="-20" r="24" />
          <circle cy="-58" r="17" />
          <circle cy="-86" r="12" />
          <path d="M0 -86l14 3l-14 3z" class="nose" />
        </g>
      </g>
    );
  return null;
}

const GUEST: Record<Loc, string> = { meadow: "fox", pond: "heron", orchard: "hedgehog", forest: "deer" };

export function RareGuest({ loc, night, onFind }: { loc: Loc; night: boolean; onFind: () => void }) {
  const kind = night ? "ufo" : GUEST[loc];
  const y = night ? 180 : loc === "pond" ? 560 : 610;
  return (
    <g class={`rare ${kind}`} style={{ "--ry": `${y}px`, "--rw": `${W + 120}px` }} onClick={onFind}>
      <g class="rarebody">
        {kind === "ufo" ? (
          <>
            <ellipse cx="0" cy="0" rx="36" ry="10" class="disc" />
            <path d="M-16 -4a16 14 0 0 1 32 0z" class="dome" />
            <path d="M-22 8l-12 60h68l-12 -60z" class="beam" />
          </>
        ) : kind === "heron" ? (
          <>
            <path d="M0 0v-30M6 0v-30" class="leg" />
            <ellipse cx="0" cy="-40" rx="18" ry="10" class="body" />
            <path d="M-14 -44q-6 -24 -16 -30" class="neck" />
            <path d="M-30 -74l-16 4l16 2z" class="beak" />
          </>
        ) : kind === "hedgehog" ? (
          <>
            <path d="M-20 0q0 -26 22 -26q20 0 22 20l8 6z" class="spikes" />
            <circle cx="26" cy="-4" r="1.6" class="eye" />
          </>
        ) : kind === "deer" ? (
          <>
            <path d="M-14 0v-24M14 0v-24M-10 0v-22M10 0v-22" class="leg" />
            <ellipse cx="0" cy="-30" rx="22" ry="11" class="body" />
            <path d="M18 -34l10 -22l8 4l-8 20z" class="body" />
            <path d="M30 -58l-4 -12M34 -58l6 -10" class="antler" />
          </>
        ) : (
          <>
            <path d="M-12 0v-12M10 0v-12" class="leg" />
            <ellipse cx="0" cy="-16" rx="20" ry="9" class="body" />
            <path d="M16 -18l14 -6l-4 -8l-6 4z" class="body" />
            <path d="M-18 -18q-24 -4 -30 10q14 4 30 -2z" class="tail" />
            <path d="M-44 -10l-6 2l6 2z" class="tip" />
          </>
        )}
      </g>
    </g>
  );
}
