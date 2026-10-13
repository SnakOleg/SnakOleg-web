import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { MAX_STAGE, PLANTS } from "../../shared/garden";
import type { Plant } from "../../shared/garden";
import { api, currentMe, loginUrl } from "../blog/api";
import { toast } from "../blog/ui";
import { found } from "../stamps/client";
import type { L } from "../lib/i18n";
import { PlantArt } from "./Plant";
import { gameStrings } from "./strings";

type Mine = { kind: Plant; stage: number; can: boolean };
type Entry = { id: string; kind: Plant; stage: number; gifts: number; name: string; own: boolean };
type Slot = { x: number; y: number; s: number; row: number };

const W = 1200;
const H = 640;
const ROWS = [
  { y: 330, s: 0.62, n: 22 },
  { y: 432, s: 0.95, n: 14 },
  { y: 560, s: 1.35, n: 8 },
];

// The front row is filled first, the visitor's own bed is the middle one of it.
const slots = (): { own: Slot; rest: Slot[] } => {
  const all: Slot[] = [];
  ROWS.forEach((r, row) => {
    const step = (W - 120) / r.n;
    for (let i = 0; i < r.n; i++) {
      const jitter = ((i * 37 + row * 11) % 9) - 4;
      all.push({ x: 60 + step * (i + 0.5) + jitter, y: r.y + (((i * 17) % 5) - 2) * 2, s: r.s, row });
    }
  });
  const front = all.filter((s) => s.row === 2);
  const ownSlot = front[3]!;
  const rest = [
    ...front.filter((s) => s !== ownSlot),
    ...all.filter((s) => s.row === 1),
    ...all.filter((s) => s.row === 0),
  ];
  return { own: ownSlot, rest };
};
const SLOTS = slots();

const phaseOf = (d: Date) => {
  const h = d.getHours() + d.getMinutes() / 60;
  const sun = h >= 6 && h < 20 ? (h - 6) / 14 : null;
  const kind = h >= 8 && h < 17 ? "day" : (h >= 5 && h < 8) || (h >= 17 && h < 21) ? "dusk" : "night";
  return { kind, sun, moon: sun === null ? ((h + 4) % 24) / 12 - 0.2 : null } as const;
};

const SKY = {
  day: ["#7cc4ee", "#d9f1fb", "#8fd08a", "#5fae6a", "#4a8f58"],
  dusk: ["#4b5a9c", "#f3a77c", "#6e9a6a", "#4d7d57", "#3b6446"],
  night: ["#0c1230", "#2a3566", "#2d4a46", "#223a38", "#182c2c"],
};

const STARS = Array.from({ length: 46 }, (_, i) => ({
  x: (i * 263) % W,
  y: 12 + ((i * 97) % 200),
  r: 0.8 + ((i * 7) % 3) * 0.5,
  d: (i % 7) * 0.5,
}));

const Can = ({ x, y }: { x: number; y: number }) => (
  <g class="can" style={{ "--cx": `${x}px`, "--cy": `${y}px` }}>
    <g class="cantilt">
      <path d="M-30 -18h46l8 36h-62z" class="canbody" />
      <path d="M16 -6l32 -22l4 5l-30 24z" class="canspout" />
      <path d="M-30 -10q-22 -4 -22 14q0 18 22 14" class="canhandle" />
      {Array.from({ length: 9 }, (_, i) => (
        <circle
          key={i}
          cx={50 + (i % 3) * 3}
          cy={-24}
          r="2.4"
          class="drop"
          style={{ animationDelay: `${0.5 + i * 0.12}s` }}
        />
      ))}
    </g>
  </g>
);

export function Garden({ l }: { l: L }) {
  const t = gameStrings(l);
  const user = currentMe()?.user;
  const [plants, setPlants] = useState<Entry[] | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);
  const [seed, setSeed] = useState<Plant>("tulip");
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [pour, setPour] = useState<Slot | null>(null);
  const [pop, setPop] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const when = useMemo(() => phaseOf(new Date()), []);
  const pal = SKY[when.kind];

  const load = async () => {
    const r = await api<{ plants: Entry[]; mine: Mine | null }>("/api/garden");
    if (r.ok) {
      setPlants(r.data.plants);
      setMine(r.data.mine);
    } else setPlants([]);
  };
  useEffect(() => void load(), []);

  const act = async (action: string, extra: object = {}) => {
    setBusy(true);
    const r = await api<{ added?: string[] }>("/api/garden", "POST", { action, ...extra });
    setBusy(false);
    if (!r.ok) {
      toast(r.data.error === "done" ? (action === "gift" ? t.giftsLeft : t.watered) : t.offline);
      return false;
    }
    r.data.added?.forEach(found);
    return true;
  };

  const water = async () => {
    if (busy || !mine?.can) return;
    if (!(await act("water"))) return;
    setPour(SLOTS.own);
    setTimeout(() => setPop("own"), 1500);
    setTimeout(() => {
      setPour(null);
      void load().then(() => setTimeout(() => setPop(null), 900));
    }, 2600);
  };

  const plant = async () => {
    if (busy) return;
    if (await act("plant", { kind: seed })) {
      await load();
      setPop("own");
      setTimeout(() => setPop(null), 1000);
    }
  };

  const dig = async () => {
    if (await act("dig")) await load();
  };

  const gift = async (p: Entry) => {
    if (busy || p.own) return;
    if (await act("gift", { target: p.id })) {
      toast(t.gifted);
      const at = placed.find((x) => x.p.id === p.id)?.slot;
      if (at) {
        setPour(at);
        setTimeout(() => setPour(null), 2600);
      }
      void load();
    }
  };

  const others = (plants ?? []).filter((p) => !p.own);
  const own = (plants ?? []).find((p) => p.own);
  const placed = [
    ...(own ? [{ p: own, slot: SLOTS.own }] : []),
    ...others.slice(0, SLOTS.rest.length).map((p, i) => ({ p, slot: SLOTS.rest[i]! })),
  ].sort((a, b) => a.slot.row - b.slot.row || a.slot.y - b.slot.y);
  const hidden = Math.max(0, others.length - SLOTS.rest.length);
  const bloom = (plants ?? []).filter((p) => p.stage >= MAX_STAGE).length;
  const focus = placed.find((x) => x.p.id === (hover ?? pick))?.p ?? null;
  const picked = placed.find((x) => x.p.id === pick)?.p ?? null;
  const tip = placed.find((x) => x.p.id === hover)?.slot ?? null;

  const sunX = when.sun === null ? 0 : 120 + when.sun * 960;
  const sunY = when.sun === null ? 0 : 230 - Math.sin(when.sun * Math.PI) * 190;
  const moonX = when.moon === null ? 0 : 120 + Math.min(1, Math.max(0, when.moon)) * 960;
  const moonY = when.moon === null ? 0 : 200 - Math.sin(Math.min(1, Math.max(0, when.moon)) * Math.PI) * 150;

  return (
    <div class={`garden ${when.kind}`}>
      <div class="gscene" ref={wrap}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.cards.garden![0]}>
          <defs>
            <linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color={pal[0]} />
              <stop offset="1" stop-color={pal[1]} />
            </linearGradient>
            <linearGradient id="gmeadow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color={pal[2]} />
              <stop offset="1" stop-color={pal[3]} />
            </linearGradient>
            <radialGradient id="gsun">
              <stop offset="0" stop-color="#fff7c2" />
              <stop offset="1" stop-color="#ffd54a" stop-opacity="0" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#gsky)" />
          {when.kind === "night" &&
            STARS.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} class="star" style={{ animationDelay: `${s.d}s` }} />
            ))}
          {when.sun !== null && (
            <g transform={`translate(${sunX} ${sunY})`}>
              <circle r="90" fill="url(#gsun)" />
              <circle r="34" fill="#ffe27a" />
            </g>
          )}
          {when.moon !== null && (
            <g transform={`translate(${moonX} ${moonY})`}>
              <circle r="30" fill="#f4f1d8" />
              <circle cx="-9" cy="-6" r="6" fill="#d9d5b6" />
              <circle cx="10" cy="9" r="4" fill="#d9d5b6" />
            </g>
          )}
          <g class="clouds" opacity={when.kind === "night" ? 0.25 : 0.9}>
            <g class="cl c1">
              <ellipse cx="260" cy="110" rx="70" ry="22" />
              <ellipse cx="310" cy="98" rx="44" ry="22" />
            </g>
            <g class="cl c2">
              <ellipse cx="760" cy="70" rx="84" ry="24" />
              <ellipse cx="815" cy="58" rx="50" ry="22" />
            </g>
            <g class="cl c3">
              <ellipse cx="1010" cy="150" rx="60" ry="18" />
            </g>
          </g>
          <path d="M0 300Q150 200 300 270T620 250T940 270T1200 230V340H0z" fill={pal[4]} opacity="0.55" />
          <g class="mill" transform="translate(1010 232)">
            <path d="M-12 40l6 -44h12l6 44z" class="millbody" />
            <g class="blades">
              <path d="M0 -4L-3 -46M0 -4L46 -1M0 -4L3 38M0 -4L-42 1" />
            </g>
          </g>
          <path d="M0 330Q200 262 420 308T820 296T1200 318V420H0z" fill={pal[3]} opacity="0.85" />
          <rect y="300" width={W} height={H - 300} fill="url(#gmeadow)" opacity="0.9" />
          <path d="M0 400q300 -26 600 -6t600 -14" class="path" />

          {placed.map(({ p, slot }) => {
            const sz = 64 * slot.s * 1.5;
            const key = p.own ? "own" : p.id;
            return (
              <g
                key={p.id}
                class={`slot${p.own ? " own" : ""}${hover === p.id || pick === p.id ? " on" : ""}${pop === key ? " pop" : ""}${p.gifts >= 3 ? " fav" : ""}`}
                tabIndex={0}
                role="button"
                aria-label={`${p.name}, ${t.plants[p.kind]}`}
                onPointerEnter={() => setHover(p.id)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(p.id)}
                onBlur={() => setHover(null)}
                onClick={() => setPick(pick === p.id ? null : p.id)}
              >
                <ellipse cx={slot.x} cy={slot.y + 2} rx={sz * 0.42} ry={sz * 0.11} class="mound" />
                <svg
                  x={slot.x - sz / 2}
                  y={slot.y - sz * 0.88}
                  width={sz}
                  height={sz}
                  viewBox="0 0 64 64"
                  overflow="visible"
                >
                  <PlantArt
                    kind={p.kind}
                    stage={p.stage}
                    label={t.plants[p.kind] ?? p.kind}
                    pot={false}
                    delay={(slot.x % 7) / 2}
                  />
                </svg>
                {p.stage >= MAX_STAGE && (
                  <g class="sparks">
                    <circle cx={slot.x - sz * 0.28} cy={slot.y - sz * 0.7} r="2.2" />
                    <circle
                      cx={slot.x + sz * 0.3}
                      cy={slot.y - sz * 0.55}
                      r="1.8"
                      style={{ animationDelay: "0.8s" }}
                    />
                    <circle
                      cx={slot.x + sz * 0.05}
                      cy={slot.y - sz * 0.95}
                      r="2"
                      style={{ animationDelay: "1.6s" }}
                    />
                  </g>
                )}
                {p.own && (
                  <g class="flag" transform={`translate(${slot.x + sz * 0.5} ${slot.y})`}>
                    <path d="M0 0V-38" />
                    <path d="M0 -38h22l-6 7l6 7h-22z" />
                  </g>
                )}
              </g>
            );
          })}

          {!own && (
            <g class="empty" onClick={() => user && void plant()}>
              <ellipse cx={SLOTS.own.x} cy={SLOTS.own.y + 2} rx="52" ry="12" class="mound free" />
              <text x={SLOTS.own.x} y={SLOTS.own.y - 26} text-anchor="middle">
                +
              </text>
            </g>
          )}

          {when.kind === "night"
            ? Array.from({ length: 16 }, (_, i) => (
                <circle
                  key={i}
                  class="firefly"
                  cx={80 + ((i * 71) % 1040)}
                  cy={360 + ((i * 53) % 220)}
                  r="2.4"
                  style={{ animationDelay: `${(i % 8) * 0.7}s`, animationDuration: `${5 + (i % 4)}s` }}
                />
              ))
            : Array.from({ length: 3 }, (_, i) => (
                <g key={i} class={`fly f${i}`}>
                  <path d="M0 0q-8 -9 -12 -2q-2 7 12 2zM0 0q8 -9 12 -2q2 7 -12 2z" />
                </g>
              ))}
          {pour && <Can x={pour.x} y={pour.y - 150 * pour.s} />}
        </svg>

        {tip && focus && !pour && (
          <div
            class="gtip"
            style={{ left: `${(tip.x / W) * 100}%`, top: `${((tip.y - 110 * tip.s) / H) * 100}%` }}
          >
            <b>{focus.name}</b>
            <span>{t.plants[focus.kind]}</span>
            <i>
              {Array.from({ length: MAX_STAGE }, (_, i) => (
                <u key={i} class={i < focus.stage ? "on" : ""} />
              ))}
            </i>
            {focus.gifts > 0 && <small>{t.giftCount(focus.gifts)}</small>}
          </div>
        )}
        {hidden > 0 && <p class="gmore">{t.more(hidden)}</p>}
      </div>

      <div class="gdeck">
        <section class="gpanel">
          <h2>{t.yourPlot}</h2>
          {!user ? (
            <a class="gbtn" href={loginUrl()}>
              {t.gardenLogin}
            </a>
          ) : mine ? (
            <div class="gmine">
              <PlantArt kind={mine.kind} stage={mine.stage} label={t.plants[mine.kind] ?? mine.kind} />
              <div>
                <b>{t.plants[mine.kind]}</b>
                <i class="gsteps">
                  {Array.from({ length: MAX_STAGE }, (_, i) => (
                    <u key={i} class={i < mine.stage ? "on" : ""} />
                  ))}
                </i>
                <small>{mine.stage >= MAX_STAGE ? t.bloom : t.growth(mine.stage)}</small>
                <div class="gacts">
                  {mine.stage < MAX_STAGE && (
                    <button
                      type="button"
                      class="gbtn"
                      disabled={busy || !mine.can || !!pour}
                      onClick={() => void water()}
                    >
                      {mine.can ? t.water : t.watered}
                    </button>
                  )}
                  <button type="button" class="glink" disabled={busy} onClick={() => void dig()}>
                    {t.dig}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div class="gseeds">
              <span>{t.pick}</span>
              <div class="gpick" role="group" aria-label={t.pick}>
                {PLANTS.map((k) => (
                  <button
                    type="button"
                    key={k}
                    class={seed === k ? "on" : ""}
                    aria-pressed={seed === k}
                    onClick={() => setSeed(k)}
                  >
                    <PlantArt kind={k} stage={4} label={t.plants[k] ?? k} />
                    <small>{t.plants[k]}</small>
                  </button>
                ))}
              </div>
              <button type="button" class="gbtn" disabled={busy} onClick={() => void plant()}>
                {t.plant}
              </button>
            </div>
          )}
        </section>

        <section class="gpanel">
          <h2>{t.garden}</h2>
          <p class="gstat">{t.gardenStats(plants?.length ?? 0, bloom)}</p>
          {picked ? (
            <div class="gpicked">
              <b>{picked.name}</b>
              <span>
                {t.plants[picked.kind]} · {picked.stage >= MAX_STAGE ? t.bloom : t.growth(picked.stage)}
              </span>
              {!picked.own && user && (
                <button
                  type="button"
                  class="gbtn"
                  disabled={busy || !!pour}
                  onClick={() => void gift(picked)}
                >
                  {t.giftBtn}
                </button>
              )}
            </div>
          ) : (
            <p class="gnote">{plants && plants.length === 0 ? t.gardenEmpty : t.gardenHint}</p>
          )}
        </section>
      </div>
    </div>
  );
}
