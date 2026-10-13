import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { COLORS, DECOS, LOCS, MAX_STAGE, PLANTS, isLoc } from "../../../shared/garden";
import type { Loc, Plant } from "../../../shared/garden";
import { api, currentMe, loginUrl } from "../../blog/api";
import { toast } from "../../blog/ui";
import { found } from "../../stamps/client";
import type { L } from "../../lib/i18n";
import { PlantArt } from "../Plant";
import { gameStrings } from "../strings";
import { Can, Critters, Glow, Particles } from "./common";
import { Deco } from "./Deco";
import { Holiday, RareGuest, gardenEvent } from "./events";
import { Bubbles, LaneActors, createLife } from "./Life";
import type { Life } from "./Life";
import { GLOWS, SCENES } from "./scenes";
import { H, SKY, STARS, W, phaseOf, seasonOf, sizeOf, slotsOf } from "./world";
import type { Look, Slot, Tone } from "./world";
import "./garden.scss";

type Mine = { kind: Plant; stage: number; can: boolean; loc: Loc; color: number; deco: string };
type Entry = {
  id: string;
  kind: Plant;
  stage: number;
  gifts: number;
  color: number;
  deco: string;
  name: string;
  own: boolean;
  given: boolean;
};
type Data = {
  loc: Loc;
  counts: Record<string, number>;
  plants: Entry[];
  mine: Mine | null;
  giftsLeft: number;
};
type Placed = { p: Entry; slot: Slot };
type Leaving = { loc: Loc; data: Data | null; dir: 1 | -1 };

const PAN_MS = 1100;

const startLoc = (): Loc => {
  const at = new URLSearchParams(location.search).get("at");
  return isLoc(at) ? at : "meadow";
};

const emptyData = (loc: Loc): Data => ({ loc, counts: {}, plants: [], mine: null, giftsLeft: 0 });

function placeAll(data: Data | null, loc: Loc) {
  const slots = slotsOf(SCENES[loc].rows);
  const own = data?.plants.find((p) => p.own);
  const others = (data?.plants ?? []).filter((p) => !p.own);
  const placed: Placed[] = [
    ...(own ? [{ p: own, slot: slots.own }] : []),
    ...others.slice(0, slots.rest.length).map((p, i) => ({ p, slot: slots.rest[i]! })),
  ];
  return { slots, placed, own, hidden: Math.max(0, others.length - slots.rest.length) };
}

const lookOf = (loc: Loc, tone: Tone, season: Look["season"]): Look => ({
  tone,
  season,
  event: gardenEvent(loc, tone),
});

function Box({ slot, cls = "" }: { slot: Slot; cls?: string }) {
  const sz = sizeOf(slot);
  const w = sz * 0.62;
  const h = sz * 0.14;
  const { x, y } = slot;
  return (
    <g class={`bed ${cls}`}>
      <path
        d={`M${x - w * 0.42} ${y - h * 0.6}H${x + w * 0.42}L${x + w / 2} ${y + h * 0.2}H${x - w / 2}z`}
        class="soil"
      />
      <path d={`M${x - w / 2} ${y + h * 0.2}H${x + w / 2}V${y + h}H${x - w / 2}z`} class="box" />
      <path d={`M${x - w / 2} ${y + h * 0.6}H${x + w / 2}`} class="plank" />
    </g>
  );
}

// One place of the garden: scenery, beds, villagers, and its own night wash and lamps.
function Stage({
  loc,
  look,
  placed,
  bed,
  life,
  free,
}: {
  loc: Loc;
  look: Look;
  placed: Placed[];
  bed: (x: Placed) => ComponentChildren;
  life: Life | null;
  free: ComponentChildren;
}) {
  const scene = SCENES[loc];
  const costume = look.event === "halloween" ? "witch" : look.event === "newyear" ? "santa" : "";
  const used = new Set(placed.map((x) => x.slot));
  const layers: { y: number; node: ComponentChildren }[] = [
    ...slotsOf(scene.rows)
      .rest.filter((x) => !used.has(x))
      .map((x) => ({ y: x.y - 0.1, node: <Box key={`${x.x}-${x.y}`} slot={x} cls="idle" /> })),
    ...placed.map((x) => ({ y: x.slot.y, node: bed(x) })),
    ...(life
      ? scene.lanes.map((lane, i) => ({
          y: lane.y,
          node: <LaneActors key={`lane${i}`} life={life} lane={i} lanes={scene.lanes} costume={costume} />,
        }))
      : []),
  ].sort((a, b) => a.y - b.y);
  return (
    <>
      {scene.Back(look)}
      {scene.lanes.map((lane) => (
        <path
          key={lane.y}
          d={`M${lane.x0} ${lane.y + 2}H${lane.x1}`}
          class="lanepath"
          style={{ strokeWidth: `${30 * lane.s}px` }}
        />
      ))}
      {look.event === "fair" && <Fair y={scene.lanes[scene.lanes.length - 1]!.y - 6} />}
      {layers.map((x) => x.node)}
      {free}
      {scene.Front(look)}
      <Holiday kind={look.event} />
      {look.tone === "dusk" && <rect width={W} height={H} class="dusk-wash" />}
      {look.tone === "night" && <rect width={W} height={H} class="night-wash" />}
      {look.tone !== "day" && GLOWS[loc].map(([x, y, r]) => <Glow key={`${x}-${y}`} x={x} y={y} r={r} />)}
      {life && <Bubbles life={life} lanes={scene.lanes} />}
    </>
  );
}

export function Garden({ l }: { l: L }) {
  const t = gameStrings(l);
  const user = currentMe()?.user;
  const [loc, setLoc] = useState<Loc>(startLoc);
  const [data, setData] = useState<Data | null>(null);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const [seed, setSeed] = useState<Plant>("tulip");
  const [color, setColor] = useState(0);
  const [deco, setDeco] = useState("");
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [pour, setPour] = useState<Slot | null>(null);
  const [pop, setPop] = useState<string | null>(null);
  const [spotted, setSpotted] = useState(false);
  const timers = useRef<number[]>([]);
  const cache = useRef(new Map<Loc, Data>());
  const where = useRef(loc);
  where.current = loc;
  const lang = useRef(l);
  lang.current = l;
  const outRef = useRef<SVGGElement>(null);
  const inRef = useRef<SVGGElement>(null);
  const cloudRef = useRef<SVGGElement>(null);

  const when = useMemo(() => phaseOf(new Date()), []);
  const season = useMemo(() => seasonOf(new Date()), []);
  const look = useMemo(() => lookOf(loc, when.kind, season), [loc, when.kind, season]);
  const event = look.event;
  const scene = SCENES[loc];
  const life = useMemo(
    () => createLife(scene.lanes, when.kind, event, () => lang.current),
    [scene, when.kind, event],
  );
  useEffect(() => () => life.stop(), [life]);

  const later = (fn: () => void, ms: number) => void timers.current.push(window.setTimeout(fn, ms));

  const fetchLoc = async (at: Loc) => {
    const r = await api<Data>(`/api/garden?loc=${at}`);
    const d = r.ok ? r.data : emptyData(at);
    cache.current.set(at, d);
    return d;
  };
  const load = async (at: Loc = where.current) => {
    const d = await fetchLoc(at);
    if (at === where.current) setData(d);
  };

  useEffect(() => {
    void load(loc).then(() => Promise.all(LOCS.filter((x) => x !== loc).map(fetchLoc)));
    return () => timers.current.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    const url = new URL(location.href);
    if (loc === "meadow") url.searchParams.delete("at");
    else url.searchParams.set("at", loc);
    history.replaceState(history.state, "", url);
  }, [loc]);
  useEffect(() => {
    if (!data?.mine) return;
    setColor(data.mine.color);
    setDeco(data.mine.deco);
  }, [data?.mine?.color, data?.mine?.deco]);

  // The camera pulls back a little and pans to the next place, while the sky drifts behind.
  useLayoutEffect(() => {
    if (!leaving) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const d = leaving.dir;
    const opts: KeyframeAnimationOptions = {
      duration: calm ? 1 : PAN_MS,
      easing: "cubic-bezier(0.65, 0, 0.35, 1)",
      fill: "forwards",
    };
    const runs = [
      outRef.current?.animate(
        [{ transform: "translateX(0)" }, { transform: `translateX(${-d * W}px)` }],
        opts,
      ),
      inRef.current?.animate([{ transform: `translateX(${d * W}px)` }, { transform: "translateX(0)" }], opts),
      cloudRef.current?.animate(
        [
          { transform: "translateX(0)" },
          { transform: `translateX(${-d * 60}px)` },
          { transform: "translateX(0)" },
        ],
        { duration: opts.duration, easing: "ease-in-out" },
      ),
    ];
    const live = runs.filter((a): a is Animation => !!a);
    void Promise.all(live.map((a) => a.finished)).then(() => {
      live.forEach((a) => a.cancel());
      setLeaving(null);
    });
  }, [leaving]);

  const goTo = async (next: Loc, dir?: 1 | -1) => {
    if (leaving || next === loc) return;
    setPick(null);
    setHover(null);
    const d = cache.current.get(next) ?? (await fetchLoc(next));
    setLeaving({ loc, data, dir: dir ?? (LOCS.indexOf(next) > LOCS.indexOf(loc) ? 1 : -1) });
    setLoc(next);
    setData(d);
  };
  const go = (step: 1 | -1) => void goTo(LOCS[(LOCS.indexOf(loc) + step + LOCS.length) % LOCS.length]!, step);

  const act = async (action: string, extra: object = {}) => {
    setBusy(true);
    const r = await api<{ added?: string[] }>("/api/garden", "POST", { action, ...extra });
    setBusy(false);
    if (!r.ok) {
      const e = r.data.error;
      toast(
        e === "already"
          ? t.alreadyGiven
          : e === "done"
            ? action === "gift"
              ? t.giftsLeft
              : t.watered
            : t.offline,
      );
      return false;
    }
    r.data.added?.forEach(found);
    return true;
  };

  const mine = data?.mine ?? null;
  const { slots, placed, own, hidden } = placeAll(data, loc);
  const away = leaving ? placeAll(leaving.data, leaving.loc) : null;

  const water = async () => {
    if (busy || pour || !mine?.can) return;
    if (mine.loc !== loc) return void goTo(mine.loc);
    if (!(await act("water"))) return;
    setPick(null);
    setPour(slots.own);
    later(() => setPop("own"), 2300);
    later(() => {
      setPour(null);
      void load().then(() => later(() => setPop(null), 1000));
    }, 3700);
  };

  const plant = async () => {
    if (busy) return;
    if (await act("plant", { kind: seed, loc, color, deco })) {
      await load();
      setPop("own");
      later(() => setPop(null), 1000);
    }
  };

  const style = async () => {
    if (await act("style", { color, deco })) {
      toast(t.styled);
      await load();
    }
  };

  const dig = async () => {
    if (await act("dig")) {
      setPick(null);
      await load();
    }
  };

  const gift = async (p: Entry) => {
    if (busy || pour || p.own) return;
    const at = placed.find((x) => x.p.id === p.id)?.slot;
    if (!(await act("gift", { target: p.id }))) return;
    toast(t.gifted);
    setPick(null);
    if (at) {
      setPour(at);
      later(() => setPour(null), 3700);
    }
    void load();
  };

  const spot = () => {
    if (spotted) return;
    setSpotted(true);
    found("rareguest");
    toast(t.rareFound);
  };

  const picked = placed.find((x) => x.p.id === pick) ?? null;
  const hovered = placed.find((x) => x.p.id === hover) ?? null;
  const bloom = (data?.plants ?? []).filter((p) => p.stage >= MAX_STAGE).length;
  const sky = SKY[when.kind];
  const sunX = when.sun === null ? 0 : 120 + when.sun * 960;
  const sunY = when.sun === null ? 0 : 250 - Math.sin(when.sun * Math.PI) * 200;
  const moon = when.moon === null ? null : Math.min(1, Math.max(0, when.moon));
  const night = when.kind === "night";

  const bed = ({ p, slot }: Placed) => {
    const sz = sizeOf(slot);
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
        onKeyDown={(e) => e.key === "Enter" && setPick(pick === p.id ? null : p.id)}
        onClick={() => setPick(pick === p.id ? null : p.id)}
      >
        <Box slot={slot} />
        <svg
          x={slot.x - sz / 2}
          y={slot.y - sz * 0.69}
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
            color={COLORS[p.color] ?? ""}
          />
        </svg>
        {p.deco && (
          <g transform={`translate(${slot.x + sz * 0.4} ${slot.y + sz * 0.1}) scale(${slot.s})`}>
            <Deco kind={p.deco} letter={p.name} />
          </g>
        )}
        {p.stage >= MAX_STAGE && (
          <g class="sparks">
            <circle cx={slot.x - sz * 0.28} cy={slot.y - sz * 0.5} r="2.2" />
            <circle
              cx={slot.x + sz * 0.3}
              cy={slot.y - sz * 0.36}
              r="1.8"
              style={{ animationDelay: "0.8s" }}
            />
            <circle
              cx={slot.x + sz * 0.05}
              cy={slot.y - sz * 0.76}
              r="2"
              style={{ animationDelay: "1.6s" }}
            />
          </g>
        )}
        {p.own && !p.deco && (
          <g class="flag" transform={`translate(${slot.x + sz * 0.4} ${slot.y + sz * 0.1})`}>
            <path d="M0 0V-38" />
            <path d="M0 -38h22l-6 7l6 7h-22z" />
          </g>
        )}
      </g>
    );
  };

  const free = !own && (
    <g class="empty" onClick={() => user && !mine && void plant()}>
      <Box slot={slots.own} cls="free" />
      <text x={slots.own.x} y={slots.own.y - 24} text-anchor="middle">
        +
      </text>
    </g>
  );

  const canK = pour ? Math.max(0.8, pour.s * 0.95) : 1;
  const canSz = pour ? sizeOf(pour) : 0;

  const card = (x: Placed, cls: "gtip" | "gpop") => (
    <div
      class={cls}
      style={{
        left: `${Math.min(88, Math.max(12, (x.slot.x / W) * 100))}%`,
        top: `${((x.slot.y - sizeOf(x.slot) * 0.72) / H) * 100}%`,
      }}
    >
      <b>{x.p.name}</b>
      <span>{t.plants[x.p.kind]}</span>
      <i>
        {Array.from({ length: MAX_STAGE }, (_, i) => (
          <u key={i} class={i < x.p.stage ? "on" : ""} />
        ))}
      </i>
      {x.p.gifts > 0 && <small>{t.giftCount(x.p.gifts)}</small>}
      {cls === "gpop" && (
        <div class="gpopacts">
          {x.p.own
            ? x.p.stage < MAX_STAGE && (
                <button
                  type="button"
                  class="gbtn"
                  disabled={busy || !!pour || !mine?.can}
                  onClick={() => void water()}
                >
                  {mine?.can ? t.water : t.watered}
                </button>
              )
            : user && (
                <button
                  type="button"
                  class="gbtn"
                  disabled={busy || !!pour || x.p.given || !data?.giftsLeft}
                  onClick={() => void gift(x.p)}
                >
                  {x.p.given ? t.alreadyGiven : data?.giftsLeft ? t.giftBtn : t.giftsLeft}
                </button>
              )}
          <button type="button" class="glink" onClick={() => setPick(null)}>
            {t.close}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div class={`garden ${when.kind} ${season}${event ? ` ev-${event}` : ""}`}>
      <nav class="gplaces" aria-label={t.garden}>
        {LOCS.map((x) => (
          <button
            type="button"
            key={x}
            class={x === loc ? "on" : ""}
            aria-pressed={x === loc}
            disabled={!!leaving}
            onClick={() => void goTo(x)}
          >
            <b>{t.locs[x]![0]}</b>
            <small>
              {(cache.current.get(x) ?? data)?.counts[x] ?? 0}
              {mine?.loc === x ? " · ★" : ""}
            </small>
          </button>
        ))}
      </nav>

      <div class={`gscene${leaving ? " panning" : ""}`}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${t.cards.garden![0]}: ${t.locs[loc]![0]}`}>
          <defs>
            <linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color={sky[0]} />
              <stop offset="1" stop-color={sky[1]} />
            </linearGradient>
            <radialGradient id="gglow">
              <stop offset="0" stop-color="#ffe38a" stop-opacity="0.75" />
              <stop offset="1" stop-color="#ffe38a" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="gsun">
              <stop offset="0" stop-color="#fff7c2" />
              <stop offset="1" stop-color="#ffd54a" stop-opacity="0" />
            </radialGradient>
            <clipPath id="gframe">
              <rect width={W} height={H} />
            </clipPath>
          </defs>
          <g clip-path="url(#gframe)">
            <rect width={W} height={H} fill="url(#gsky)" onClick={() => setPick(null)} />
            {night &&
              STARS.map((s, i) => (
                <circle
                  key={i}
                  cx={s.x}
                  cy={s.y}
                  r={s.r}
                  class="star"
                  style={{ animationDelay: `${s.d}s` }}
                />
              ))}
            {when.sun !== null && (
              <g transform={`translate(${sunX} ${sunY})`}>
                <circle r="96" fill="url(#gsun)" />
                <circle r="34" fill="#ffe27a" />
              </g>
            )}
            {moon !== null && (
              <g transform={`translate(${120 + moon * 960} ${220 - Math.sin(moon * Math.PI) * 160})`}>
                <circle r="30" fill="#f4f1d8" />
                <circle cx="-9" cy="-6" r="6" fill="#d9d5b6" />
                <circle cx="10" cy="9" r="4" fill="#d9d5b6" />
              </g>
            )}
            <g ref={cloudRef}>
              <g class="clouds" opacity={night ? 0.25 : event === "rain" ? 1 : 0.92}>
                <g class="cl c1">
                  <ellipse cx="260" cy="110" rx="70" ry="22" />
                  <ellipse cx="310" cy="98" rx="44" ry="22" />
                </g>
                <g class="cl c2">
                  <ellipse cx="760" cy="70" rx="84" ry="24" />
                  <ellipse cx="815" cy="58" rx="50" ry="22" />
                </g>
                <g class="cl c3">
                  <ellipse cx="1010" cy="170" rx="60" ry="18" />
                </g>
              </g>
            </g>
            {(event === "rain" || event === "snow") && <rect width={W} height={H} class="gloom" />}

            <rect y={H - 120} width={W} height="120" class="meadow" />
            {leaving && away && (
              <g ref={outRef} class="stage">
                <Stage
                  loc={leaving.loc}
                  look={lookOf(leaving.loc, when.kind, season)}
                  placed={away.placed}
                  bed={bed}
                  life={null}
                  free={null}
                />
              </g>
            )}
            <g ref={inRef} class="stage">
              <Stage loc={loc} look={look} placed={placed} bed={bed} life={life} free={free} />
            </g>

            {pour && (
              <ellipse
                class="splash"
                cx={pour.x}
                cy={pour.y - canSz * 0.05}
                rx={canSz * 0.3}
                ry={canSz * 0.07}
              />
            )}
            <Particles season={event === "snow" ? "winter" : season} rain={event === "rain"} />
            {season !== "winter" && <Critters night={night} />}
            {event === "visitor" && !spotted && !leaving && (
              <RareGuest loc={loc} night={night} onFind={spot} />
            )}
            {pour && (
              <Can
                x={Math.round(pour.x + 53 * canK)}
                y={Math.round(pour.y - canSz * 0.86 - 20 * canK)}
                k={canK}
                fall={Math.round((canSz * 0.7) / canK)}
              />
            )}
          </g>
        </svg>

        <button
          type="button"
          class="gnav prev"
          aria-label={t.prevLoc}
          disabled={!!leaving}
          onClick={() => go(-1)}
        >
          ‹
        </button>
        <button
          type="button"
          class="gnav next"
          aria-label={t.nextLoc}
          disabled={!!leaving}
          onClick={() => go(1)}
        >
          ›
        </button>
        <p class="gwhere" key={loc}>
          <b>{t.locs[loc]![0]}</b>
          {event && <span>{t.events[event]}</span>}
        </p>
        {hovered && !pour && !leaving && hovered.p.id !== pick && card(hovered, "gtip")}
        {picked && !leaving && card(picked, "gpop")}
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
              <PlantArt
                kind={mine.kind}
                stage={mine.stage}
                label={t.plants[mine.kind] ?? mine.kind}
                color={COLORS[color] ?? ""}
              />
              <div>
                <b>{t.plants[mine.kind]}</b>
                <i class="gsteps">
                  {Array.from({ length: MAX_STAGE }, (_, i) => (
                    <u key={i} class={i < mine.stage ? "on" : ""} />
                  ))}
                </i>
                <small>{mine.stage >= MAX_STAGE ? t.bloom : t.growth(mine.stage)}</small>
                {mine.loc !== loc && (
                  <p class="gat">
                    {t.yourAt(t.locs[mine.loc]![0])}{" "}
                    <button type="button" class="glink" onClick={() => void goTo(mine.loc)}>
                      {t.goThere}
                    </button>
                  </p>
                )}
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
              <Style t={t} color={color} deco={deco} setColor={setColor} setDeco={setDeco} />
              {(color !== mine.color || deco !== mine.deco) && (
                <button type="button" class="gbtn" disabled={busy} onClick={() => void style()}>
                  {t.saveStyle}
                </button>
              )}
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
                    <PlantArt kind={k} stage={4} label={t.plants[k] ?? k} color={COLORS[color] ?? ""} />
                    <small>{t.plants[k]}</small>
                  </button>
                ))}
              </div>
              <Style t={t} color={color} deco={deco} setColor={setColor} setDeco={setDeco} />
              <button type="button" class="gbtn" disabled={busy} onClick={() => void plant()}>
                {t.plantAt(t.locs[loc]![0])}
              </button>
            </div>
          )}
        </section>

        <section class="gpanel">
          <h2>{t.locs[loc]![0]}</h2>
          <p class="gstat">{t.gardenStats(data?.plants.length ?? 0, bloom)}</p>
          {user && <p class="gstat">{t.giftsToday(5 - (data?.giftsLeft ?? 5))}</p>}
          <p class="gnote">{data && data.plants.length === 0 ? t.gardenEmpty : t.gardenHint}</p>
        </section>
      </div>
    </div>
  );
}

function Style({
  t,
  color,
  deco,
  setColor,
  setDeco,
}: {
  t: ReturnType<typeof gameStrings>;
  color: number;
  deco: string;
  setColor: (n: number) => void;
  setDeco: (d: string) => void;
}) {
  return (
    <div class="gstyle">
      <span>{t.colorLabel}</span>
      <div class="gswatch" role="group" aria-label={t.colorLabel}>
        {COLORS.map((c, i) => (
          <button
            type="button"
            key={i}
            class={i === color ? "on" : ""}
            aria-pressed={i === color}
            aria-label={`${t.colorLabel} ${i + 1}`}
            style={{ "--sw": c || "conic-gradient(#e0467a, #f4c430, #5aa86f, #4fa3d1, #e0467a)" }}
            onClick={() => setColor(i)}
          />
        ))}
      </div>
      <span>{t.decoLabel}</span>
      <div class="gdecos" role="group" aria-label={t.decoLabel}>
        {DECOS.map((d) => (
          <button
            type="button"
            key={d}
            class={d === deco ? "on" : ""}
            aria-pressed={d === deco}
            onClick={() => setDeco(d)}
          >
            <svg viewBox="-24 -56 48 60" aria-hidden="true">
              <Deco kind={d} letter="Я" />
            </svg>
            <small>{t.decos[d]}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function Fair({ y }: { y: number }) {
  return (
    <g class="fair">
      {[260, 600, 940].map((x, i) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <rect x="-46" y="-40" width="92" height="40" class="counter" />
          <path d="M-54 -40l8 -26h92l8 26z" class={`awning a${i}`} />
          {[-28, -10, 8, 26].map((cx, j) => (
            <circle key={cx} cx={cx} cy="-46" r="6" class={`goods g${(i + j) % 3}`} />
          ))}
        </g>
      ))}
      {[180, 420, 780, 1020].map((x, i) => (
        <g key={x} transform={`translate(${x} ${y - 70})`}>
          <g class="balloon" style={{ animationDelay: `${i * 0.8}s` }}>
            <path d="M0 0v-50" class="string" />
            <ellipse cy="-62" rx="12" ry="15" class={`b${i % 3}`} />
          </g>
        </g>
      ))}
    </g>
  );
}
