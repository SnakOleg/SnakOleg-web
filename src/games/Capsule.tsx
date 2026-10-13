import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { CAPSULE_MAX } from "../../shared/garden";
import { api, currentMe, loginUrl } from "../blog/api";
import { toast } from "../blog/ui";
import { found } from "../stamps/client";
import type { L } from "../lib/i18n";
import { gameStrings } from "./strings";

type Mine = { id: number; created: number; opens: number; opened: number | null; body?: string };
type Pod = { opens: number; name: string };
type Phase = "idle" | "letters" | "travel" | "arrive";

const DAY = 86_400_000;
const PODS = 24;
const HOLD_MS = 650;
const PRESETS = [
  ["week", 7],
  ["month", 30],
  ["half", 183],
  ["year", 365],
] as const;

const fmt = (ms: number, l: L) => {
  const t = gameStrings(l);
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / 3_600_000);
  return d > 0 ? `${t.days(d)} ${t.hours(h)}` : t.hours(Math.max(1, h));
};
const noon = (days: number) => {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(12, 0, 0, 0);
  return d.getTime();
};
const inputValue = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const shortDate = (ts: number, l: L) =>
  new Date(ts).toLocaleDateString(l === "ru" ? "ru-RU" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

function Tube({ full }: { full: boolean }) {
  return (
    <svg viewBox="0 0 60 120" class="tube" aria-hidden="true">
      <rect x="6" y="6" width="48" height="108" rx="24" class="glass" />
      {full && (
        <g class="occ">
          <rect x="21" y="30" width="18" height="60" rx="9" class="body" />
          <path d="M21 58h18" class="band" />
          <circle cx="30" cy="42" r="3" class="eye" />
        </g>
      )}
      <rect x="6" y="6" width="48" height="108" rx="24" class="frost" />
      <path d="M14 22q-2 14 0 30" class="gloss" />
    </svg>
  );
}

export function Capsule({ l }: { l: L }) {
  const t = gameStrings(l);
  const user = currentMe()?.user;
  const [text, setText] = useState("");
  const [days, setDays] = useState<number>(30);
  const [date, setDate] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [flying, setFlying] = useState("");
  const [mine, setMine] = useState<Mine[]>([]);
  const [vault, setVault] = useState<Pod[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [holding, setHolding] = useState(false);
  const [target, setTarget] = useState(-1);
  const bay = useRef<HTMLDivElement>(null);
  const room = useRef<HTMLDivElement>(null);
  const consoleEl = useRef<HTMLElement>(null);
  const flight = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const hold = useRef(0);

  const load = async () => {
    const r = await api<{ vault: Pod[]; total: number; mine: Mine[] }>("/api/capsule");
    if (!r.ok) return;
    setVault(r.data.vault);
    setTotal(r.data.total);
    setMine(r.data.mine);
  };
  useEffect(() => {
    void load();
    return () => {
      timers.current.forEach(clearTimeout);
      clearTimeout(hold.current);
    };
  }, []);

  const letters = useMemo(
    () =>
      [...flying.replace(/\s+/g, " ").slice(0, 30)].map((ch, i) => ({
        ch,
        x: Math.round((Math.random() - 0.5) * 360),
        y: Math.round((Math.random() - 0.5) * 140 - 30),
        r: Math.round((Math.random() - 0.5) * 140),
        d: i * 30,
      })),
    [flying],
  );

  const opens = date ? new Date(`${date}T12:00:00`).getTime() : noon(days);
  const wait = (ms: number) => new Promise<void>((done) => timers.current.push(window.setTimeout(done, ms)));

  const travel = async (to: number) => {
    const rb = bay.current?.getBoundingClientRect();
    const rc = consoleEl.current?.getBoundingClientRect();
    const rp = room.current?.querySelectorAll<HTMLElement>(".pod")[to]?.getBoundingClientRect();
    const el = flight.current;
    if (!rb || !rc || !rp || !el) return;
    const sx = rc.left + rc.width / 2 - rb.left;
    const sy = rc.top + rc.height / 2 - rb.top;
    const ex = rp.left + rp.width / 2 - rb.left;
    const ey = rp.top + rp.height / 2 - rb.top;
    const hover = Math.min(sy, ey) - 40;
    await el.animate(
      [
        { transform: `translate(${sx}px, ${sy}px) rotate(90deg) scale(0.8)`, opacity: 0 },
        { transform: `translate(${sx}px, ${sy - 40}px) rotate(90deg) scale(1)`, opacity: 1, offset: 0.2 },
        {
          transform: `translate(${(sx + ex) / 2}px, ${hover}px) rotate(0deg) scale(1)`,
          opacity: 1,
          offset: 0.6,
        },
        { transform: `translate(${ex}px, ${ey}px) rotate(0deg) scale(0.55)`, opacity: 0.9 },
      ],
      { duration: 1500, easing: "cubic-bezier(0.55, 0, 0.35, 1)", fill: "forwards" },
    ).finished;
  };

  const submit = async () => {
    if (busy || !text.trim() || phase !== "idle") return;
    setBusy(true);
    const r = await api<{ added?: string[] }>("/api/capsule", "POST", { body: text, opens });
    setBusy(false);
    if (!r.ok)
      return void toast(
        r.data.error === "limit" ? t.limit : r.data.error === "bad_date" ? t.badDate : t.offline,
      );
    r.data.added?.forEach(found);
    const to = Math.min(vault.length, PODS - 1);
    setFlying(text);
    setText("");
    setDate("");
    setTarget(to);
    setPhase("letters");
    await wait(1500);
    setPhase("travel");
    await travel(to);
    setPhase("arrive");
    await wait(1400);
    setPhase("idle");
    setTarget(-1);
    await load();
  };

  const beginHold = () => {
    if (!text.trim() || busy || phase !== "idle") return;
    setHolding(true);
    hold.current = window.setTimeout(() => {
      setHolding(false);
      void submit();
    }, HOLD_MS);
  };
  const endHold = () => {
    clearTimeout(hold.current);
    setHolding(false);
  };

  const unseal = async (id: number) => {
    const r = await api<{ capsule: Mine }>("/api/capsule", "POST", { open: id });
    if (r.ok) setMine((m) => m.map((c) => (c.id === id ? r.data.capsule : c)));
    else toast(t.offline);
  };

  const now = Date.now();
  const mineOpens = new Set(mine.filter((c) => !c.opened).map((c) => c.opens));
  const pods = Array.from({ length: PODS }, (_, i) => vault[i] ?? null);
  const used = Math.max(total, vault.length);

  return (
    <div class="bay" ref={bay}>
      <div class="bayhead">
        <div class="hazard" />
        <div class="plate">
          <b>{t.bayId}</b>
          <span>{t.bayTitle}</span>
        </div>
        <ul class="readouts">
          <li>
            <i class="led ok" />
            {t.bayOk}
          </li>
          <li>
            {t.bayTemp} <b>-196°C</b>
          </li>
          <li>
            {t.bayPods}{" "}
            <b>
              {used}/{PODS}
            </b>
          </li>
        </ul>
      </div>

      <div class="bayroom" ref={room}>
        <ul class="pods" aria-label={t.vault}>
          {pods.map((p, i) => {
            const ready = !!p && p.opens <= now;
            const own = !!p && mineOpens.has(p.opens);
            return (
              <li
                key={i}
                class={`pod${p ? " full" : ""}${own ? " mine" : ""}${ready ? " ready" : ""}${target === i && phase === "arrive" ? " arrive" : ""}`}
                title={p ? `${p.name} · ${shortDate(p.opens, l)}` : t.free}
              >
                <Tube full={!!p || (target === i && phase === "arrive")} />
                <span class="steam" aria-hidden="true" />
                <div class="podplate">
                  <small>{t.podLabel(i + 1)}</small>
                  <b>{p ? (ready ? t.ready : fmt(p.opens - now, l)) : t.free}</b>
                  {own && <em>{t.mineTag}</em>}
                </div>
                <i class={`led ${p ? (ready ? "ok" : "amber") : "off"}`} />
              </li>
            );
          })}
        </ul>
        <div class="flycap" ref={flight} aria-hidden="true">
          <svg viewBox="0 0 48 96">
            <path d="M8 44V22a16 16 0 0 1 32 0v22z" class="a" />
            <path d="M8 52v22a16 16 0 0 0 32 0V52z" class="b" />
            <path d="M6 48h36" class="band" />
          </svg>
        </div>
      </div>

      <div class="baydeck">
        <section class="console" ref={consoleEl}>
          <h2>
            <i class="led ok" />
            {t.bayLog}
          </h2>
          {phase === "letters" && (
            <div class="cletters" aria-hidden="true">
              {letters.map((x, i) => (
                <span
                  key={i}
                  style={{ "--x": `${x.x}px`, "--y": `${x.y}px`, "--r": `${x.r}deg`, "--d": `${x.d}ms` }}
                >
                  {x.ch}
                </span>
              ))}
            </div>
          )}
          {user ? (
            <form
              class={phase === "idle" ? "" : "away"}
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <p class="ghint">{t.logHint}</p>
              <div class="screen">
                <textarea
                  rows={5}
                  value={text}
                  maxLength={CAPSULE_MAX}
                  placeholder={t.capsulePlace}
                  aria-label={t.capsulePlace}
                  onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
                />
                <small>
                  {text.length}/{CAPSULE_MAX}
                </small>
              </div>
              <div class="switches" role="group" aria-label={t.wake}>
                <span>{t.wake}</span>
                {PRESETS.map(([k, n]) => (
                  <button
                    type="button"
                    key={k}
                    class={!date && days === n ? "on" : ""}
                    onClick={() => (setDays(n), setDate(""))}
                  >
                    <i />
                    {t[k]}
                  </button>
                ))}
                <input
                  type="date"
                  value={date}
                  min={inputValue(noon(1))}
                  max={inputValue(noon(365 * 5 - 1))}
                  aria-label={t.custom}
                  onInput={(e) => setDate((e.target as HTMLInputElement).value)}
                />
              </div>
              <button
                type="button"
                class={`engage${holding ? " holding" : ""}`}
                disabled={!text.trim() || busy}
                onPointerDown={beginHold}
                onPointerUp={endHold}
                onPointerLeave={endHold}
                onPointerCancel={endHold}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), void submit())}
              >
                <span>{busy ? t.sealing : t.engage}</span>
                <small>{t.hold}</small>
              </button>
            </form>
          ) : (
            <a class="gbtn" href={loginUrl()}>
              {t.capsuleLogin}
            </a>
          )}
        </section>

        <section class="manifest">
          <h2>{t.mine}</h2>
          {mine.length === 0 ? (
            <p class="gnote">{t.vaultN(used)}</p>
          ) : (
            <ul>
              {mine.map((c) => (
                <li key={c.id} class={c.opens <= now ? "ready" : ""}>
                  {c.opened && c.body !== undefined ? (
                    <div class="thaw">
                      <small>
                        {t.logOut} · {shortDate(c.created, l)}
                      </small>
                      <p>{c.body}</p>
                    </div>
                  ) : c.opens <= now ? (
                    <>
                      <span>
                        <i class="led ok" />
                        {t.openNow}
                      </span>
                      <button type="button" class="gbtn" onClick={() => void unseal(c.id)}>
                        {t.thaw}
                      </button>
                    </>
                  ) : (
                    <>
                      <span>
                        <i class="led amber" />
                        {t.wakeIn}
                      </span>
                      <b>{fmt(c.opens - now, l)}</b>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
