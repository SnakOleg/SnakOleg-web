import { useEffect, useRef, useState } from "preact/hooks";
import { site } from "../config";
import type { Announce } from "../config/announce";
import { tx } from "../lib/i18n";
import type { L } from "../lib/i18n";
import { Ico } from "./ui/Icon";

const KEY = "snak-ann";

// A notice is remembered as dismissed by a hash of its content, so editing the text shows it again.
const idOf = (a: Announce) => {
  let h = 5381;
  for (const c of a.style + a.text.ru + a.text.en + a.href) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
};
const readDone = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const parse = (s: string) => (s ? Date.parse(s) : NaN);
export const isLive = (a: Announce, now = Date.now()) => {
  if (!a.on) return false;
  const from = parse(a.from);
  const to = parse(a.to);
  return !(from > now) && !(to < now);
};

export function Announcements({ l, preview = false }: { l: L; preview?: boolean }) {
  const [done, setDone] = useState<string[]>(readDone);
  const [late, setLate] = useState(false);
  const live = (site.announce as Announce[]).filter((a) => isLive(a) && (preview || !done.includes(idOf(a))));
  const ticker = live.find((a) => a.style === "ticker");
  const banner = live.find((a) => a.style === "banner");
  const modal = live.find((a) => a.style === "modal");

  useEffect(() => {
    const id = setTimeout(() => setLate(true), preview ? 0 : 1200);
    return () => clearTimeout(id);
  }, [preview]);

  const bars = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    const set = () => root.style.setProperty("--ann-h", `${bars.current?.offsetHeight ?? 0}px`);
    set();
    const ro = new ResizeObserver(set);
    if (bars.current) ro.observe(bars.current);
    return () => {
      ro.disconnect();
      root.style.setProperty("--ann-h", "0px");
    };
  }, [ticker, banner]);

  const dismiss = (a: Announce) => {
    if (preview) return;
    const next = [...done, idOf(a)].slice(-30);
    setDone(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage unavailable: it will show again next visit
    }
  };

  const link = (a: Announce) =>
    a.href ? (
      <a href={a.href} {...(/^https?:/.test(a.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {tx(a.label, l) || a.href}
      </a>
    ) : null;

  return (
    <>
      {(ticker || banner) && (
        <div class="ann-bars" ref={bars}>
          {banner && (
            <div class={`ann ann-banner t-${banner.tone}`} role="status">
              <span>{tx(banner.text, l)}</span>
              {link(banner)}
              <button type="button" aria-label={site.ui[l].close} onClick={() => dismiss(banner)}>
                <Ico n="x" />
              </button>
            </div>
          )}
          {ticker && (
            <div class={`ann ann-ticker t-${ticker.tone}`} role="status">
              <div class="track" aria-label={tx(ticker.text, l)}>
                {[0, 1].map((n) => (
                  <span key={n} aria-hidden={n ? "true" : undefined}>
                    {tx(ticker.text, l)}
                    {link(ticker)}
                    <i aria-hidden="true">✦</i>
                  </span>
                ))}
              </div>
              <button type="button" aria-label={site.ui[l].close} onClick={() => dismiss(ticker)}>
                <Ico n="x" />
              </button>
            </div>
          )}
        </div>
      )}
      {modal && late && (
        <AnnModal a={modal} l={l} onClose={() => dismiss(modal)} preview={preview} link={link(modal)} />
      )}
    </>
  );
}

function AnnModal({
  a,
  l,
  onClose,
  preview,
  link,
}: {
  a: Announce;
  l: L;
  onClose: () => void;
  preview: boolean;
  link: preact.ComponentChild;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !box.current) return;
      const f = [...box.current.querySelectorAll<HTMLElement>("a, button")];
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, []);
  return (
    <div class="ann-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={box}
        class={`ann-modal t-${a.tone}`}
        role="dialog"
        aria-modal="true"
        aria-label={tx(a.text, l)}
      >
        <p>{tx(a.text, l)}</p>
        <div class="acts">
          {link}
          <button type="button" onClick={onClose}>
            {preview ? site.ui[l].close : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
