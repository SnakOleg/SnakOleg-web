import { useEffect, useMemo, useState } from "preact/hooks";
import { api } from "../blog/api";
import type { L } from "../lib/i18n";

type World = { w: number; h: number; c: Record<string, string> };
type Data = { visits: Record<string, number>; cards: Record<string, number> };

const T = {
  ru: {
    title: "Откуда заходят",
    visits: "визитов",
    cards: "открыток",
    countries: (n: number) => `${n} стран`,
    guest: "В гостевую книгу",
    empty: "Карта оживёт, когда появятся первые визиты.",
  },
  en: {
    title: "Where visitors come from",
    visits: "visits",
    cards: "postcards",
    countries: (n: number) => `${n} countries`,
    guest: "To the guestbook",
    empty: "The map comes alive with the first visits.",
  },
};

// Antarctica is dropped and the polar sea cropped, so the land fills more of the frame.
const TOP = 20;
const BOTTOM = 442;

const regionName = (cc: string, l: L) => {
  try {
    return new Intl.DisplayNames([l], { type: "region" }).of(cc) ?? cc;
  } catch {
    return cc;
  }
};

export function VisitorMap({ l }: { l: L }) {
  const t = T[l];
  const [world, setWorld] = useState<World | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [tip, setTip] = useState<string | null>(null);

  useEffect(() => {
    void api<Data>("/api/map").then((r) => {
      if (r.ok && r.data.visits) setData({ visits: r.data.visits, cards: r.data.cards ?? {} });
      else setData({ visits: {}, cards: {} });
    });
    void import("../assets/map/world.json").then((m) => setWorld(m.default as World));
  }, []);

  const max = useMemo(() => Math.max(1, ...Object.values(data?.visits ?? {})), [data]);
  if (!world || !data) return null;
  const lit = Object.keys(data.visits).length;
  const level = (n: number) => 0.18 + 0.82 * (Math.log(n + 1) / Math.log(max + 1));

  return (
    <section class="vmap" aria-labelledby="vm-h">
      <div class="vmh">
        <h2 id="vm-h" class="ph">
          {t.title}
        </h2>
        <span class="vmn">{t.countries(lit)}</span>
      </div>
      {lit === 0 && <p class="vmhint">{t.empty}</p>}
      <div class="vmwrap">
        <svg
          viewBox={`0 ${TOP} ${world.w} ${BOTTOM - TOP}`}
          role="img"
          aria-label={t.title}
          onPointerLeave={() => setTip(null)}
        >
          {Object.entries(world.c)
            .filter(([cc]) => cc !== "AQ")
            .map(([cc, d]) => {
              const n = data.visits[cc] ?? 0;
              const cards = data.cards[cc] ?? 0;
              return (
                <path
                  key={cc}
                  d={d}
                  class={`${n ? "lit" : ""}${cards ? " card" : ""}`}
                  style={n ? { "--lv": level(n) } : undefined}
                  onPointerEnter={() => setTip(cc)}
                  onPointerDown={() => setTip(cc)}
                />
              );
            })}
        </svg>
        <p class="vmtip" aria-live="polite">
          {tip ? (
            <>
              <b>{regionName(tip, l)}</b>
              {" · "}
              {data.visits[tip] ?? 0} {t.visits}
              {data.cards[tip] ? ` · ${data.cards[tip]} ${t.cards}` : ""}
            </>
          ) : (
            <a href="/blog/guestbook">{t.guest}</a>
          )}
        </p>
      </div>
    </section>
  );
}
