import { useEffect, useRef, useState } from "preact/hooks";
import { site } from "../config";
import type { UsesWindow } from "../config/uses";
import { Shell } from "../components/Shell";
import { Num } from "../components/ui/Num";
import { Ico } from "../components/ui/Icon";
import { tx } from "../lib/i18n";
import type { L } from "../lib/i18n";
import { Defs, Keys, Laptop, Mic, Monitor, Mouse, Pc, Phone, Watch, Wave, useNow } from "./art";
import "./uses.scss";

type Group = "all" | "devices" | "gear" | "soft";
const GROUP: Record<string, Exclude<Group, "all">> = {
  laptop: "devices",
  phone: "devices",
  watch: "devices",
  pc: "devices",
  monitor: "gear",
  keyboard: "gear",
  mouse: "gear",
  mic: "gear",
  apps: "soft",
};
const groupOf = (w: UsesWindow) => GROUP[w.kind] ?? "gear";
const text = (w: UsesWindow, l: L) =>
  [
    tx(w.title, l),
    tx(w.name, l),
    w.sub ? tx(w.sub, l) : "",
    ...w.rows.flatMap((r) => [tx(r.label, l), tx(r.value, l)]),
    ...(w.apps ?? []).map((a) => a.name),
  ]
    .join(" ")
    .toLowerCase();

function Art({ w, now, onKey }: { w: UsesWindow; now: Date; onKey: () => void }) {
  switch (w.kind) {
    case "laptop":
      return <Laptop />;
    case "phone":
      return <Phone />;
    case "watch":
      return <Watch now={now} />;
    case "pc":
      return <Pc />;
    case "monitor":
      return <Monitor />;
    case "mouse":
      return <Mouse />;
    case "mic":
      return (
        <div class="micart">
          <Mic />
          <Wave />
        </div>
      );
    case "keyboard":
      return <Keys onPress={onKey} />;
    default:
      return null;
  }
}

function Tile({ a, l }: { a: NonNullable<UsesWindow["apps"]>[number]; l: L }) {
  return (
    <li style={{ "--hue": a.hue }}>
      <span class="ico" aria-hidden="true">
        {a.abbr}
      </span>
      <b>{a.name}</b>
      {a.note && <small>{tx(a.note, l)}</small>}
    </li>
  );
}

const REACH = 180;
const glow = (e: MouseEvent) => {
  for (const el of (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(".bc")) {
    const b = el.getBoundingClientRect();
    const dx = Math.max(b.left - e.clientX, 0, e.clientX - b.right);
    const dy = Math.max(b.top - e.clientY, 0, e.clientY - b.bottom);
    el.style.setProperty("--mx", `${e.clientX - b.left}px`);
    el.style.setProperty("--my", `${e.clientY - b.top}px`);
    el.style.setProperty("--near", Math.max(0, 1 - Math.hypot(dx, dy) / REACH).toFixed(3));
  }
};
const dim = (e: MouseEvent) => {
  for (const el of (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(".bc"))
    el.style.setProperty("--near", "0");
};

function Page({ l }: { l: L }) {
  const u = site.ui[l];
  const now = useNow(1000);
  const [group, setGroup] = useState<Group>("all");
  const [q, setQ] = useState("");
  const [keys, setKeys] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const items = site.uses as UsesWindow[];

  useEffect(() => {
    document.title = `${u.usesTitle} - SnakOleg`;
  }, [u.usesTitle]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest("input, textarea, select");
      if (!typing && (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"))) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const gadgets = items.filter((w) => groupOf(w) !== "soft");
  const ram = items.reduce((n, w) => n + (w.ram ?? 0), 0);
  const disk = items.reduce((n, w) => n + (w.storage ?? 0), 0);
  const needle = q.trim().toLowerCase();
  const match = (w: UsesWindow) =>
    (group === "all" || groupOf(w) === group) && (!needle || text(w, l).includes(needle));
  const shownCount = items.filter(match).length;

  return (
    <div id="main" class="uses">
      <div class="aurora" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <Defs />
      </svg>

      <header class="uh">
        <p class="kick">/uses</p>
        <h1>{u.usesTitle}</h1>
        <p class="lede">{u.usesLede}</p>
        <ul class="counters">
          <li>
            <Num to={gadgets.length} />
            <span>{u.usesDevices}</span>
          </li>
          <li>
            <Num to={ram} />
            <span>{u.usesRam}</span>
          </li>
          <li>
            <Num to={Math.round(disk / 100) / 10} />
            <span>{u.usesDisk}</span>
          </li>
          <li>
            <b>{keys.toLocaleString("ru-RU")}</b>
            <span>{u.usesKeys}</span>
          </li>
        </ul>
      </header>

      <div class="ubar">
        <div class="chips" role="group" aria-label={u.usesFilter}>
          {(["all", "devices", "gear", "soft"] as const).map((g) => (
            <button type="button" class={group === g ? "sel" : ""} onClick={() => setGroup(g)}>
              {u[("usesG_" + g) as "usesG_all"]}
            </button>
          ))}
        </div>
        <label class="find">
          <Ico n="search" />
          <input
            ref={input}
            type="search"
            value={q}
            placeholder={u.usesSearchHint}
            aria-label={u.usesSearch}
            onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
      </div>

      <section class="bento" onMouseMove={glow} onMouseLeave={dim} aria-live="polite">
        {items.map((w) => {
          const on = match(w);
          const apps = w.kind === "apps";
          return (
            <article
              class={`bc k-${w.kind}${on ? "" : " off"}`}
              aria-hidden={on ? undefined : "true"}
              id={`w-${w.id}`}
            >
              <header>
                <span class="tag">{tx(w.title, l)}</span>
                {w.hz && <span class="pill">{w.hz} Hz</span>}
              </header>
              {!apps && (
                <div class="stage">
                  <Art w={w} now={now} onKey={() => setKeys((n) => n + 1)} />
                </div>
              )}
              <h2>{tx(w.name, l)}</h2>
              {w.sub && <p class="sub">{tx(w.sub, l)}</p>}
              {w.rows.length > 0 && (
                <dl class="specs">
                  {w.rows.map((r) => (
                    <div>
                      <dt>{tx(r.label, l)}</dt>
                      <dd>{tx(r.value, l)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {apps && (
                <ul class="tiles">
                  {(w.apps ?? []).map((a) => (
                    <Tile a={a} l={l} />
                  ))}
                </ul>
              )}
              {w.kind === "keyboard" && <p class="hint">{u.usesPress}</p>}
            </article>
          );
        })}
      </section>
      {shownCount === 0 && <p class="none">{u.usesNothing}</p>}
    </div>
  );
}

export function Uses() {
  return <Shell page="uses">{({ l }) => <Page l={l} />}</Shell>;
}
