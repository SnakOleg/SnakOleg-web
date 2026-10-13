import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { CAPSULE_BAY, CAPSULE_MAX } from "../../shared/garden";
import { api, currentMe, loginUrl } from "../blog/api";
import { toast } from "../blog/ui";
import { found } from "../stamps/client";
import type { L } from "../lib/i18n";
import { gameStrings } from "./strings";

type Mine = { id: number; created: number; opens: number; opened: number | null; body?: string };
type Pod = { opens: number; name: string };
type Phase = "idle" | "pack" | "seal" | "travel" | "arrive";

const DAY = 86_400_000;
const BAY = CAPSULE_BAY;
const ROW = 8;
const MIN_PODS = 24;
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

function Shell() {
  return (
    <svg viewBox="0 0 48 96" class="shell">
      <path d="M8 52v22a16 16 0 0 0 32 0V52z" class="b" />
      <rect x="12" y="50" width="24" height="6" rx="3" class="mouth" />
      <g class="lid">
        <path d="M8 46V22a16 16 0 0 1 32 0v24z" class="a" />
        <path d="M14 20q1-7 7-9" class="gloss" />
      </g>
      <path d="M8 49h32" class="band" />
    </svg>
  );
}

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
  const [landed, setLanded] = useState<Pod | null>(null);
  const bay = useRef<HTMLDivElement>(null);
  const room = useRef<HTMLDivElement>(null);
  const packEl = useRef<HTMLDivElement>(null);
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
    const box = bay.current;
    const from = packEl.current?.querySelector(".capsule")?.getBoundingClientRect();
    const pod = room.current?.querySelectorAll<HTMLElement>(".pod .tube")[to]?.getBoundingClientRect();
    const el = flight.current;
    if (!box || !from || !pod || !el) return;
    const rb = box.getBoundingClientRect();
    const at = (r: DOMRect) => ({
      x: r.left + r.width / 2 - rb.left - box.clientLeft,
      y: r.top + r.height / 2 - rb.top - box.clientTop,
    });
    const a = at(from);
    const z = at(pod);
    const end = Math.max(0.2, Math.min(0.5, (pod.width * 0.45) / from.width));
    const lift = Math.min(a.y, z.y) - 70;
    const pose = (x: number, y: number, scale: number, turn: number) =>
      `translate(${Math.round(x)}px, ${Math.round(y)}px) rotate(${turn}deg) scale(${scale})`;
    room.current?.querySelectorAll(".pod")[to]?.scrollIntoView({ block: "center", behavior: "smooth" });
    const run = el.animate(
      [
        { transform: pose(a.x, a.y, 1, 0), opacity: 1, easing: "cubic-bezier(0.3, 0, 0.2, 1)" },
        { transform: pose(a.x, a.y - 36, 1.06, -4), opacity: 1, offset: 0.22, easing: "ease-in-out" },
        {
          transform: pose((a.x + z.x) / 2, lift, 0.8, 4),
          opacity: 1,
          offset: 0.62,
          easing: "cubic-bezier(0.5, 0, 0.7, 0.4)",
        },
        { transform: pose(z.x, z.y, end, 0), opacity: 1, offset: 0.92 },
        { transform: pose(z.x, z.y, end * 0.9, 0), opacity: 0 },
      ],
      { duration: 1800, fill: "forwards" },
    );
    await run.finished;
    run.cancel();
  };

  const submit = async () => {
    if (busy || !text.trim() || phase !== "idle") return;
    setBusy(true);
    const r = await api<{ added?: string[] }>("/api/capsule", "POST", { body: text, opens });
    setBusy(false);
    if (!r.ok)
      return void toast(
        r.data.error === "limit"
          ? t.limit
          : r.data.error === "lifetime"
            ? t.lifetime
            : r.data.error === "full"
              ? t.bayFull
              : r.data.error === "bad_date"
                ? t.badDate
                : t.offline,
      );
    r.data.added?.forEach(found);
    const slot = vault.filter((p) => p.opens <= opens).length;
    const to = Math.min(slot, shown - 1);
    const mineName = currentMe()?.user?.name ?? "";
    setFlying(text);
    setText("");
    setDate("");
    setTarget(to);
    setPhase("pack");
    await wait(1800);
    setPhase("seal");
    await wait(1000);
    setPhase("travel");
    await travel(to);
    if (slot < BAY) setLanded({ opens, name: mineName });
    setPhase("arrive");
    await wait(1600);
    setPhase("idle");
    setTarget(-1);
    setLanded(null);
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
  const used = Math.max(total, vault.length);
  const shown = Math.min(BAY, Math.max(MIN_PODS, Math.ceil((vault.length + 1) / ROW) * ROW));
  const list = landed
    ? [
        ...vault.filter((p) => p.opens <= landed.opens),
        landed,
        ...vault.filter((p) => p.opens > landed.opens),
      ]
    : vault;
  const pods = Array.from({ length: shown }, (_, i) => list[i] ?? null);

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
              {used}/{BAY}
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
                <Tube full={!!p} />
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
      </div>

      <div class="flycap" ref={flight} aria-hidden="true">
        <Shell />
      </div>

      <div class="baydeck">
        <section class="console">
          <h2>
            <i class="led ok" />
            {t.bayLog}
          </h2>
          {(phase === "pack" || phase === "seal") && (
            <div class={`pack ${phase === "pack" ? "open" : "closed"}`} ref={packEl} aria-hidden="true">
              <div class="capsule">
                <Shell />
                <i class="ring" />
              </div>
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
