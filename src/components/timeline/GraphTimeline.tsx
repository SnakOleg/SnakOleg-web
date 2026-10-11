import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { buildNodes } from "../../lib/github";
import { commitsWord, fmt, tx } from "../../lib/i18n";
import type { L } from "../../lib/i18n";
import type { GH } from "../../hooks/useGithub";
import { Ico } from "../ui/Icon";

const GRAPH_W = 74;
const DRAW_MS = 1100;
const laneX = (n: number) => 22 + n * 30;
const radius = (mine?: number) => 6 + Math.min(4, Math.log10((mine ?? 1) + 1) * 1.8);

type Link = { id: string; d: string; lane: number; child: number; parent: number };

function useRowHeight() {
  const [height, setHeight] = useState(() => (innerWidth < 700 ? 190 : 150));
  useEffect(() => {
    const onResize = () => setHeight(innerWidth < 700 ? 190 : 150);
    addEventListener("resize", onResize);
    return () => removeEventListener("resize", onResize);
  }, []);
  return height;
}

export function GraphTimeline({ l, gh }: { l: L; gh: GH }) {
  const row = useRowHeight();
  const nodes = useMemo(() => buildNodes(gh.repos), [gh.repos]);
  const count = nodes.length;
  const [hover, setHover] = useState(-1);
  const [seen, setSeen] = useState<ReadonlySet<number>>(new Set());
  const [flowing, setFlowing] = useState<ReadonlySet<number>>(new Set());
  const cards = useRef(new Map<number, HTMLElement>());

  const y = (i: number) => (count - 1 - i) * row + row / 2;

  useEffect(() => {
    const timers: number[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        const fresh = entries
          .filter((e) => e.isIntersecting)
          .map((e) => {
            observer.unobserve(e.target);
            return Number((e.target as HTMLElement).dataset.i);
          });
        if (!fresh.length) return;
        setSeen((prev) => new Set([...prev, ...fresh]));
        timers.push(window.setTimeout(() => setFlowing((prev) => new Set([...prev, ...fresh])), DRAW_MS));
      },
      { threshold: 0.35 },
    );
    cards.current.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [count, row]);

  const links: Link[] = [];
  nodes.forEach((node, child) => {
    node.parents.forEach((parent) => {
      const from = nodes[parent];
      const [xc, xp, yc, yp] = [laneX(node.lane), laneX(from.lane), y(child), y(parent)];
      let d = `M${xp} ${yp}L${xc} ${yc}`;
      if (node.lane > from.lane) {
        d = `M${xp} ${yp}C${xp} ${yp - row * 0.55} ${xc} ${yp - row * 0.45} ${xc} ${yp - row}L${xc} ${yc}`;
      } else if (node.lane < from.lane) {
        d = `M${xp} ${yp}L${xp} ${yc + row}C${xp} ${yc + row * 0.45} ${xc} ${yc + row * 0.55} ${xc} ${yc}`;
      }
      links.push({ id: `tl-${child}-${parent}`, d, lane: Math.max(node.lane, from.lane), child, parent });
    });
  });

  const touches = (k: Link) => hover === k.child || hover === k.parent;
  const drawn = (k: Link) => seen.has(k.child) || seen.has(k.parent);
  const alive = (k: Link) => flowing.has(k.child) || flowing.has(k.parent);

  const years = new Map<number, string>();
  let lastYear = "";
  for (let i = count - 1; i >= 0; i--) {
    const year = nodes[i].date.slice(0, 4);
    if (year !== lastYear) years.set(i, year);
    lastYear = year;
  }

  return (
    <>
      <div class="tl">
        {[...years].map(([i, year]) => (
          <span class="yr" style={{ top: `${y(i) - 9}px` }}>
            {year}
          </span>
        ))}

        <svg
          class={`tg${hover >= 0 ? " focus" : ""}`}
          width={GRAPH_W}
          height={count * row}
          aria-hidden="true"
        >
          {links.map((k) => (
            <path
              id={k.id}
              class={`l${k.lane}${drawn(k) ? " on" : ""}${touches(k) ? " hot" : ""}`}
              d={k.d}
              pathLength={1}
            />
          ))}
          {nodes.map((n, i) => (
            <line
              class={`stub l${n.lane}${hover === i ? " hot" : ""}`}
              x1={laneX(n.lane)}
              x2={GRAPH_W + 10}
              y1={y(i)}
              y2={y(i)}
            />
          ))}
          {links.filter(alive).map((k) => (
            <circle class={`pulse l${k.lane}${touches(k) ? " hot" : ""}`} r={touches(k) ? 5 : 3.5}>
              <animateMotion dur={`${3.2 + (k.child % 3) * 0.7}s`} repeatCount="indefinite">
                <mpath href={`#${k.id}`} />
              </animateMotion>
            </circle>
          ))}
          {nodes.map((n, i) => (
            <g
              class={`node l${n.lane}${seen.has(i) ? " on" : ""}${hover === i ? " hot" : ""}${i === count - 1 ? " head" : ""}`}
              transform={`translate(${laneX(n.lane)} ${y(i)})`}
            >
              <circle class="ring" r={radius(n.mine)} />
              <circle class="dot" r={radius(n.mine)} />
            </g>
          ))}
        </svg>

        <ol>
          {nodes
            .map((n, i) => ({ n, i }))
            .reverse()
            .map(({ n, i }) => {
              const isEvent = n.key.startsWith("ev");
              const same = fmt(n.date, l) === fmt(n.last, l);
              const range =
                isEvent || same ? fmt(n.date, l, isEvent) : `${fmt(n.date, l)} → ${fmt(n.last, l)}`;
              const title = tx(n.title, l);
              const own = n.mine === n.commits ? n.mine : `${n.mine}/${n.commits}`;
              return (
                <li
                  ref={(el) => {
                    if (el) cards.current.set(i, el);
                  }}
                  data-i={i}
                  class={`${seen.has(i) ? "in" : ""}${hover === i ? " hot" : ""}`}
                  style={{ height: `${row}px` }}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(-1)}
                  onFocusIn={() => setHover(i)}
                  onFocusOut={() => setHover(-1)}
                >
                  <div class="tcard">
                    <div class="tm">
                      {n.hash && <code>{n.hash}</code>}
                      <span>{range}</span>
                      {(n.ref || i === count - 1) && <em class={`ref l${n.lane}`}>{n.ref ?? "HEAD"}</em>}
                    </div>
                    <h3>
                      {n.url ? <a href={n.url}>{title}</a> : title}
                      {n.priv && <Ico n="lock" />}
                    </h3>
                    {n.desc && <p>{tx(n.desc, l)}</p>}
                    {(n.tags.length > 0 || n.mine) && (
                      <div class="tech">
                        {n.tags.map((s) => (
                          <i>{s}</i>
                        ))}
                        {!!n.mine && (
                          <i class="cc">
                            {own} {commitsWord(n.mine === n.commits ? n.mine : (n.commits ?? 0), l)}
                          </i>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
        </ol>
      </div>
    </>
  );
}
