import { useEffect, useRef, useState } from "preact/hooks";
import type { L } from "../lib/i18n";
import cursorSvg from "../assets/icons/ui/cursor.svg?raw";
import { connect } from "./client";
import type { Conn, Handlers, Me, Peer } from "./client";
import { fakeConnect } from "./demo";
import { nameOf } from "./names";
import { liveStrings } from "./strings";
import "./live.scss";

const DEMO = Boolean(import.meta.env.VITE_DEMO || import.meta.env.VITE_BLOG_DEMO);
const PREF = "snak-cursors";
const IDLE_MS = 4000;
const GONE_MS = 20_000;

const fine = () => matchMedia("(hover: hover) and (pointer: fine)").matches;
const readPref = () => {
  try {
    return localStorage.getItem(PREF) !== "off";
  } catch {
    return true;
  }
};

type Dot = { p: Peer; node: HTMLElement; label: HTMLElement; cx: number; cy: number; seen: number };

export function Live({ l }: { l: L }) {
  const t = liveStrings(l);
  const [n, setN] = useState(0);
  const [me, setMe] = useState<Me | null>(null);
  const [on, setOn] = useState(() => readPref() && fine());
  const [open, setOpen] = useState(false);
  const layer = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const onRef = useRef(on);
  const lRef = useRef(l);
  const conn = useRef<Conn | null>(null);
  onRef.current = on;
  lRef.current = l;

  useEffect(() => {
    const dots = new Map<string, Dot>();
    let raf = 0;

    const draw = () => {
      raf = 0;
      let moving = false;
      for (const d of dots.values()) {
        const tx = d.p.x * innerWidth;
        const ty = d.p.y;
        d.cx += (tx - d.cx) * 0.28;
        d.cy += (ty - d.cy) * 0.28;
        if (Math.abs(tx - d.cx) > 0.5 || Math.abs(ty - d.cy) > 0.5) moving = true;
        const y = d.cy - scrollY;
        d.node.style.transform = `translate3d(${d.cx}px, ${y}px, 0)`;
        d.node.classList.toggle("off", y < -40 || y > innerHeight + 10);
      }
      if (moving) raf = requestAnimationFrame(draw);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const drop = (id: string) => {
      dots.get(id)?.node.remove();
      dots.delete(id);
    };

    const h: Handlers = {
      count: setN,
      me: setMe,
      move(p) {
        let d = dots.get(p.id);
        if (!d) {
          const node = document.createElement("div");
          node.className = "lc";
          node.style.setProperty("--ch", String(p.hue));
          node.innerHTML = cursorSvg;
          const label = document.createElement("span");
          node.append(label);
          layer.current?.append(node);
          d = { p, node, label, cx: p.x * innerWidth, cy: p.y, seen: 0 };
          dots.set(p.id, d);
        }
        d.p = p;
        d.seen = Date.now();
        const name = nameOf(p.a, p.b, lRef.current);
        if (d.label.textContent !== name) d.label.textContent = name;
        d.node.classList.remove("idle");
        kick();
      },
      gone: drop,
      reset() {
        for (const id of [...dots.keys()]) drop(id);
      },
    };

    const c = (DEMO ? fakeConnect : connect)(h, () => onRef.current);
    conn.current = c;
    const sweep = window.setInterval(() => {
      const now = Date.now();
      for (const [id, d] of dots) {
        if (now - d.seen > GONE_MS) drop(id);
        else if (now - d.seen > IDLE_MS) d.node.classList.add("idle");
      }
    }, 1000);
    addEventListener("scroll", kick, { passive: true });
    addEventListener("resize", kick);
    return () => {
      c.stop();
      clearInterval(sweep);
      cancelAnimationFrame(raf);
      removeEventListener("scroll", kick);
      removeEventListener("resize", kick);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const toggle = (v: boolean) => {
    setOn(v);
    onRef.current = v;
    conn.current?.setCursors(v);
    try {
      localStorage.setItem(PREF, v ? "on" : "off");
    } catch {
      // private mode: the choice lasts until reload
    }
  };

  return (
    <>
      <div class={`lcur${on ? "" : " hide"}`} ref={layer} aria-hidden="true" />
      {n > 0 && (
        <div class="online" ref={box}>
          <button
            type="button"
            class="livebtn"
            aria-expanded={open}
            aria-label={t.label(n)}
            onClick={() => setOpen(!open)}
          >
            <i class="dot" aria-hidden="true" />
            <b>{n}</b> {t.online}
          </button>
          {open && (
            <div class="livepop" role="dialog" aria-label={t.label(n)}>
              <p class="lh">{t.label(n)}</p>
              {fine() ? (
                <>
                  <label class="lsw">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => toggle((e.target as HTMLInputElement).checked)}
                    />
                    <span class="track" aria-hidden="true" />
                    {t.cursors}
                  </label>
                  {me && on && (
                    <p class="you">
                      {t.you} <b style={{ "--ch": me.hue }}>{nameOf(me.a, me.b, l)}</b>
                    </p>
                  )}
                  <p class="hint">{t.hint}</p>
                </>
              ) : (
                <p class="hint">{t.touch}</p>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
