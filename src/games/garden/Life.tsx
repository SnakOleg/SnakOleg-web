import { useEffect, useState } from "preact/hooks";
import type { L } from "../../lib/i18n";
import type { Lane, Tone } from "./world";

type Kind = "person" | "dog";
type Mode = "walk" | "idle" | "talk";
type Actor = {
  id: number;
  kind: Kind;
  lane: number;
  x: number;
  face: 1 | -1;
  mode: Mode;
  until: number;
  dur: number;
  look: number;
  say?: string;
  late?: boolean;
  quiet: number;
};

const OUTFITS = [
  ["#e0467a", "#2f3b55", "#f1c7a0", "#4a2e1e"],
  ["#4fa3d1", "#4a4a4a", "#e7b48c", "#1f1b18"],
  ["#f2b134", "#3d5a80", "#c98b5e", "#2b1a10"],
  ["#5aa86f", "#5a4030", "#f3d2b3", "#c9772e"],
  ["#9b7fd6", "#2a2a3a", "#d9a37a", "#3a2a20"],
  ["#ff8a5b", "#33553f", "#efc29c", "#7a4a26"],
];

const TALK = {
  ru: [
    ["Привет!", "Привет 👋"],
    ["Как грядка?", "Растёт потихоньку"],
    ["Полил уже?", "Ещё нет 😅"],
    ["Видел лису у опушки?", "Нет, где?!"],
    ["Вечером к костру?", "Конечно!"],
    ["Тыквы в этом году огромные", "Одна моя 🎃"],
    ["У пруда опять утки", "Пойду покормлю"],
    ["Кто посадил лаванду?", "Пахнет на весь луг"],
  ],
  en: [
    ["Hi!", "Hey 👋"],
    ["How's your bed?", "Growing slowly"],
    ["Watered yet?", "Not yet 😅"],
    ["Seen the fox by the woods?", "No, where?!"],
    ["Campfire tonight?", "Sure!"],
    ["Huge pumpkins this year", "One is mine 🎃"],
    ["Ducks at the pond again", "I'll go feed them"],
    ["Who planted lavender?", "The whole meadow smells"],
  ],
};

const EVENT_TALK: Record<string, Record<L, string[]>> = {
  halloween: { ru: ["С Хэллоуином!", "Сладость или гадость!"], en: ["Happy Halloween!", "Trick or treat!"] },
  newyear: { ru: ["С наступающим!", "И тебя!"], en: ["Happy New Year!", "You too!"] },
  rain: { ru: ["Ну и ливень", "Зато всё полито"], en: ["What a downpour", "At least it's watered"] },
  fair: { ru: ["Почём яблоки?", "Для тебя даром"], en: ["How much for apples?", "Free for you"] },
};

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]!;
const speedOf = (a: Actor, lanes: Lane[]) => (a.kind === "dog" ? 95 : 48) * (lanes[a.lane]?.s ?? 1);

function cast(lanes: Lane[], tone: Tone, event: string) {
  const per = tone === "night" ? 1 : event === "fair" ? 4 : 2;
  const out: Actor[] = [];
  lanes.forEach((lane, li) => {
    for (let i = 0; i < per; i++)
      out.push({
        id: out.length,
        kind: "person",
        lane: li,
        x: lane.x0 + ((i + 0.2 + Math.random() * 0.6) / per) * (lane.x1 - lane.x0),
        face: Math.random() < 0.5 ? 1 : -1,
        mode: "idle",
        until: Date.now() + Math.random() * 3000,
        dur: 0,
        look: (out.length * 5 + li) % OUTFITS.length,
        quiet: 0,
      });
  });
  if (tone !== "night")
    out.push({
      id: out.length,
      kind: "dog",
      lane: lanes.length - 1,
      x: lanes[lanes.length - 1]!.x0 + 100,
      face: 1,
      mode: "idle",
      until: Date.now() + 1500,
      dur: 0,
      look: 0,
      quiet: 0,
    });
  return out;
}

const ROOM = 48;

// Picks a spot nobody else is standing on or heading to, so people do not pile up on top of each other.
function freeSpot(a: Actor, all: Actor[], lane: Lane, want: number) {
  const taken = (x: number) => all.some((o) => o !== a && o.lane === a.lane && Math.abs(o.x - x) < ROOM);
  const clamp = (x: number) => Math.min(lane.x1, Math.max(lane.x0, x));
  let x = clamp(want);
  for (let i = 1; taken(x) && i < 8; i++) x = clamp(want + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * ROOM);
  return x;
}

export type Life = { get: () => Actor[]; sub: (fn: () => void) => () => void; stop: () => void };

// A few villagers wander along the paths, stop, and sometimes chat when they meet.
// The state lives outside Preact, so a tick redraws only the villagers and not the whole garden.
export function createLife(lanes: Lane[], tone: Tone, event: string, lang: () => L): Life {
  let actors = cast(lanes, tone, event);
  const subs = new Set<() => void>();
  const tick = () => {
    const now = Date.now();
    const next = actors.map((a) => ({ ...a }));
    for (const a of next) {
      if (now < a.until) continue;
      const lane = lanes[a.lane]!;
      if (a.mode === "walk") {
        a.mode = "idle";
        a.dur = 0;
        a.until = now + 1500 + Math.random() * 3500;
        continue;
      }
      a.say = undefined;
      a.late = false;
      const span = 80 + Math.random() * 360;
      const dir = a.x < lane.x0 + 80 ? 1 : a.x > lane.x1 - 80 ? -1 : Math.random() < 0.5 ? 1 : -1;
      // Now and then someone heads over to a neighbour, which is how chats start.
      const friend =
        a.kind === "person" && now > a.quiet && Math.random() < 0.45
          ? next.find((o) => o !== a && o.kind === "person" && o.lane === a.lane && o.mode !== "walk")
          : undefined;
      const goal = friend ? friend.x + (a.x < friend.x ? -60 : 60) : a.x + dir * span;
      const to = freeSpot(a, next, lane, goal);
      if (Math.abs(to - a.x) < 8) {
        a.until = now + 1200;
        continue;
      }
      a.face = to >= a.x ? 1 : -1;
      a.dur = Math.abs(to - a.x) / speedOf(a, lanes);
      a.x = to;
      a.mode = "walk";
      a.until = now + a.dur * 1000;
      if (friend) friend.until = Math.max(friend.until, a.until + 900);
    }
    const idle = next.filter((a) => a.kind === "person" && a.mode === "idle" && now > a.quiet);
    for (const a of idle) {
      const b = idle.find(
        (o) => o !== a && o.lane === a.lane && o.mode === "idle" && Math.abs(o.x - a.x) < 140,
      );
      if (!b || a.mode !== "idle") continue;
      const l = lang();
      const special = EVENT_TALK[event]?.[l];
      const [one, two] = special && Math.random() < 0.6 ? special : pick(TALK[l]);
      for (const [p, line, late] of [
        [a, one, false],
        [b, two, true],
      ] as const) {
        p.mode = "talk";
        p.say = line;
        p.late = late;
        p.until = now + 4200;
        p.quiet = now + 20000;
        p.face = (p === a ? b.x - a.x : a.x - b.x) >= 0 ? 1 : -1;
      }
    }
    actors = next;
    subs.forEach((fn) => fn());
  };
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const id = calm ? 0 : window.setInterval(tick, 700);
  return {
    get: () => actors,
    sub: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    stop: () => clearInterval(id),
  };
}

const useActors = (life: Life) => {
  const [, redraw] = useState(0);
  useEffect(() => life.sub(() => redraw((n) => n + 1)), [life]);
  return life.get();
};

function Person({ look, walking, costume }: { look: number; walking: boolean; costume: string }) {
  const [shirt, pants, skin, hair] = OUTFITS[look % OUTFITS.length]!;
  return (
    <g class={`pp${walking ? " walk" : ""}`}>
      <path d="M-4 -24L-5 0" class="leg l" stroke={pants} />
      <path d="M4 -24L5 0" class="leg r" stroke={pants} />
      <path d="M-10 -44L-14 -26" class="arm l" stroke={shirt} />
      <path d="M10 -44L14 -26" class="arm r" stroke={shirt} />
      <rect x="-10" y="-48" width="20" height="26" rx="8" fill={shirt} />
      <circle cy="-57" r="9" fill={skin} />
      <circle cx="4" cy="-58" r="1.3" class="eye" />
      {costume === "witch" ? (
        <path d="M-14 -60h28l-12 -4l-4 -22z" class="witch" />
      ) : costume === "santa" ? (
        <>
          <path d="M-10 -61q10 -16 20 0z" class="santa" />
          <circle cx="12" cy="-66" r="3" class="pom" />
        </>
      ) : (
        <path d="M-9 -58q1 -10 9 -10q9 0 9 8q-6 -4 -18 2z" fill={hair} />
      )}
    </g>
  );
}

function Dog({ walking }: { walking: boolean }) {
  return (
    <g class={`dog${walking ? " walk" : ""}`}>
      <path d="M-10 -10L-11 0M10 -10L11 0" class="leg l" />
      <path d="M-6 -10L-7 0M6 -10L7 0" class="leg r" />
      <ellipse cx="0" cy="-14" rx="15" ry="7" class="fur" />
      <circle cx="15" cy="-21" r="7" class="fur" />
      <path d="M12 -27l-2 -7l6 4z" class="ear" />
      <circle cx="18" cy="-22" r="1.2" class="eye" />
      <path d="M-14 -16q-8 -6 -6 -14" class="tail" />
    </g>
  );
}

export function LaneActors({
  life,
  lane,
  lanes,
  costume,
}: {
  life: Life;
  lane: number;
  lanes: Lane[];
  costume: string;
}) {
  const actors = useActors(life);
  const ln = lanes[lane]!;
  return (
    <g class="life">
      {actors
        .filter((a) => a.lane === lane)
        .map((a) => (
          <g
            key={a.id}
            class="actor"
            style={{
              transform: `translate(${a.x}px, ${ln.y}px) scale(${ln.s})`,
              transition: `transform ${a.dur}s linear`,
            }}
          >
            <g transform={`scale(${a.face} 1)`}>
              {a.kind === "dog" ? (
                <Dog walking={a.mode === "walk"} />
              ) : (
                <Person look={a.look} walking={a.mode === "walk"} costume={costume} />
              )}
            </g>
          </g>
        ))}
    </g>
  );
}

export function Bubbles({ life, lanes }: { life: Life; lanes: Lane[] }) {
  const actors = useActors(life);
  return (
    <g class="bubbles">
      {actors
        .filter((a) => a.say)
        .map((a) => {
          const ln = lanes[a.lane]!;
          const w = Math.max(40, a.say!.length * 8.4 + 22);
          return (
            <g
              key={`${a.id}-${a.say}`}
              transform={`translate(${Math.round(a.x)} ${Math.round(ln.y - 78 * ln.s - (a.late ? 34 : 0))})`}
            >
              <g class={`bubble${a.late ? " late" : ""}`}>
                <rect x={-w / 2} y="-30" width={w} height="26" rx="13" />
                <path d="M-5 -5l5 8l5 -8z" />
                <text y="-12" text-anchor="middle">
                  {a.say}
                </text>
              </g>
            </g>
          );
        })}
    </g>
  );
}
