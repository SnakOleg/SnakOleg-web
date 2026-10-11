import { useEffect, useState } from "preact/hooks";
import { site } from "../config";
import { fmt } from "../lib/i18n";
import type { L } from "../lib/i18n";
import { fetchViews } from "../lib/counter";
import { snapshot } from "../lib/github";

const T = {
  ru: {
    dial: [
      "Набор номера 8-800-555-35-35...",
      "Ждём ответа модема... кррр-пшшш-дзинь",
      "Соединение на 56 000 бит/с установлено",
    ],
    skip: "Нажми, чтобы не ждать",
    under: "САЙТ ВЕЧНО В РАЗРАБОТКЕ",
    ring: "Веб-кольцо",
    prev: "« назад",
    next: "дальше »",
    rnd: "наугад",
    guest: "Гостевая книга",
    sign: "Подписать гостевую",
    clock: "Время на сайте",
    best: "Лучше всего смотрится в Netscape Navigator 4.0 при 800x600",
  },
  en: {
    dial: [
      "Dialing 1-800-555-3535...",
      "Waiting for the modem... krrr-pshhh-ding",
      "Connected at 56 000 bps",
    ],
    skip: "Click to skip",
    under: "THIS SITE IS ALWAYS UNDER CONSTRUCTION",
    ring: "Web ring",
    prev: "« prev",
    next: "next »",
    rnd: "random",
    guest: "Guestbook",
    sign: "Sign my guestbook",
    clock: "Server time",
    best: "Best viewed in Netscape Navigator 4.0 at 800x600",
  },
};

const RING: [string, string][] = [
  ["Мой стек", "/uses"],
  ["Блог", "/blog"],
  ...site.projects.filter((p) => p.href?.startsWith("http")).map((p) => [p.name, p.href] as [string, string]),
];

export function RetroDial({ l }: { l: L }) {
  const [step, setStep] = useState(() => {
    try {
      if (sessionStorage.getItem("snak-dial") || matchMedia("(prefers-reduced-motion: reduce)").matches)
        return -1;
      sessionStorage.setItem("snak-dial", "1");
    } catch {
      return -1;
    }
    return 0;
  });
  useEffect(() => {
    if (step < 0) return;
    if (step > 2) {
      setStep(-1);
      return;
    }
    const id = setTimeout(() => setStep(step + 1), 1000);
    return () => clearTimeout(id);
  }, [step]);
  useEffect(() => {
    if (step < 0) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setStep(-1);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [step < 0]);
  if (step < 0) return null;
  const t = T[l];
  return (
    <div class="r-dial" role="status" onClick={() => setStep(-1)}>
      <div class="r-win">
        <div class="r-title">
          <span>Connect to Internet</span>
          <i>x</i>
        </div>
        <div class="r-body">
          <p class="r-pc" aria-hidden="true">
            🖥️ ☎️ 🌐
          </p>
          <p>{t.dial[Math.min(step, 2)]}</p>
          <div class="r-bar2" aria-hidden="true">
            <i style={{ width: `${(step + 1) * 33}%` }} />
          </div>
          <small>{t.skip}</small>
        </div>
      </div>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <time dateTime={now.toISOString()}>{now.toLocaleTimeString("ru-RU", { hour12: false })}</time>;
}

const BUTTONS: [string, string, string][] = [
  ["PREACT", "#673ab8", "#ffffff"],
  ["TYPESCRIPT", "#3178c6", "#ffffff"],
  ["CLOUDFLARE", "#f38020", "#1a1a1a"],
  ["GITHUB", "#24292f", "#ffffff"],
  ["VITE", "#646cff", "#ffffff"],
  ["ANY BROWSER", "#0a8f3c", "#ffffff"],
  ["NO COOKIES", "#b22222", "#ffffff"],
  ["MADE ON A MAC", "#8a8a8a", "#101010"],
  ["HTML 5", "#e44d26", "#ffffff"],
  ["1280x800", "#222266", "#9fe8ff"],
];

export function RetroBar({ l, onExit }: { l: L; onExit: () => void }) {
  const u = site.ui[l];
  return (
    <div class="r-bar">
      <span class="r-dvd" aria-hidden="true">
        S/O
      </span>
      <div class="r-marquee" aria-hidden="true">
        <span>{u.retroMarquee}</span>
      </div>
      <button type="button" onClick={onExit}>
        {u.retroExit}
      </button>
    </div>
  );
}

export function RetroFooter({ l }: { l: L }) {
  const u = site.ui[l];
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    void fetchViews().then(setViews);
  }, []);

  const t = T[l];
  const [ring, setRing] = useState(0);
  const go = (n: number) => setRing((ring + n + RING.length) % RING.length);
  const [name, href] = RING[ring];
  const digits = String((views ?? 1336) + 1).padStart(7, "0");

  return (
    <section class="r-foot" aria-label="2003">
      <div class="r-tape" aria-hidden="true">
        <span>
          🚧 {t.under} 🚧 {t.under} 🚧 {t.under} 🚧
        </span>
      </div>
      <p class="r-count">
        {u.retroVisitor}
        <span class="r-led" role="img" aria-label={String(Number(digits))}>
          {[...digits].map((d) => (
            <i aria-hidden="true">{d}</i>
          ))}
        </span>
      </p>
      <ul class="r-buttons" aria-hidden="true">
        {BUTTONS.map(([text, bg, fg]) => (
          <li>
            <svg width="88" height="31" viewBox="0 0 88 31" shape-rendering="crispEdges">
              <rect width="88" height="31" fill={bg} />
              <path d="M0 0h88v2H0zM0 0h2v31H0z" fill="#ffffff" opacity=".55" />
              <path d="M0 29h88v2H0zM86 0h2v31h-2z" fill="#000000" opacity=".5" />
              <text
                x="44"
                y="19"
                text-anchor="middle"
                fill={fg}
                font-family="monospace"
                font-size="10"
                font-weight="700"
              >
                {text}
              </text>
            </svg>
          </li>
        ))}
      </ul>
      <div class="r-ring">
        <b>{t.ring}</b>
        <button type="button" onClick={() => go(-1)}>
          {t.prev}
        </button>
        <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener">
          {name}
        </a>
        <button type="button" onClick={() => go(1)}>
          {t.next}
        </button>
        <button type="button" onClick={() => setRing(Math.floor(Math.random() * RING.length))}>
          {t.rnd}
        </button>
      </div>
      <p class="r-guest">
        📖 {t.guest}: <a href="/blog">{t.sign}</a>
      </p>
      <p class="r-note">
        {t.clock}: <Clock /> · {t.best}
      </p>
      <p class="r-note">
        {u.retroUpdated} {fmt(snapshot.generatedAt, l, true)} · {u.retroBuilt}
      </p>
    </section>
  );
}
