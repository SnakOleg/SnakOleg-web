import type { ComponentChildren } from "preact";
import type { Loc } from "../../../shared/garden";

export const W = 1200;
export const H = 800;

export type Tone = "day" | "dusk" | "night";
export type Season = "spring" | "summer" | "autumn" | "winter";
export type Slot = { x: number; y: number; s: number; row: number };
export type Row = { y: number; s: number; n: number; x0: number; x1: number };
export type Lane = { y: number; s: number; x0: number; x1: number };
export type Look = { tone: Tone; season: Season; event: string };

export type SceneDef = {
  id: Loc;
  rows: Row[];
  lanes: Lane[];
  Back: (p: Look) => ComponentChildren;
  Front: (p: Look) => ComponentChildren;
};

// A stable pseudo random number, so the scenery looks the same on every visit.
export const rnd = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export const seasonOf = (d: Date): Season => {
  const m = d.getMonth();
  return m < 2 || m === 11 ? "winter" : m < 5 ? "spring" : m < 8 ? "summer" : "autumn";
};

export const phaseOf = (d: Date) => {
  const h = d.getHours() + d.getMinutes() / 60;
  const sun = h >= 6 && h < 20 ? (h - 6) / 14 : null;
  const kind: Tone = h >= 8 && h < 17 ? "day" : (h >= 5 && h < 8) || (h >= 17 && h < 21) ? "dusk" : "night";
  return { kind, sun, moon: sun === null ? ((h + 4) % 24) / 12 - 0.2 : null };
};

// The front row is filled first and the visitor's own bed sits in the middle of it.
export function slotsOf(rows: Row[]) {
  const all: Slot[] = [];
  rows.forEach((r, row) => {
    const step = (r.x1 - r.x0) / r.n;
    for (let i = 0; i < r.n; i++) {
      const jitter = ((i * 37 + row * 11) % 9) - 4;
      all.push({ x: r.x0 + step * (i + 0.5) + jitter, y: r.y + (((i * 17) % 5) - 2) * 2, s: r.s, row });
    }
  });
  const last = rows.length - 1;
  const front = all.filter((s) => s.row === last);
  const own = front[Math.floor((front.length - 1) / 2)]!;
  const rest = [
    ...front.filter((s) => s !== own),
    ...rows
      .slice(0, -1)
      .map((_, row) => all.filter((s) => s.row === row))
      .reverse()
      .flat(),
  ];
  return { own, rest };
}

export const sizeOf = (slot: Slot) => 64 * slot.s * 1.5;

export const SKY: Record<Tone, [string, string]> = {
  day: ["#6fbce8", "#e2f4fb"],
  dusk: ["#4b5a9c", "#f3a77c"],
  night: ["#0c1230", "#2a3566"],
};

export const STARS = Array.from({ length: 56 }, (_, i) => ({
  x: (i * 263) % W,
  y: 12 + ((i * 97) % 200),
  r: 0.8 + ((i * 7) % 3) * 0.5,
  d: (i % 7) * 0.5,
}));
