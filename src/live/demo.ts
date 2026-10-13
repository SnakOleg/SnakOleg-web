import type { Conn, Handlers } from "./client";

// Demo builds have no server: a few made-up visitors wander around the page.
export function fakeConnect(h: Handlers, cursorsOn: () => boolean): Conn {
  const bots = [
    { id: "d1", a: 0, b: 0, hue: 275, sx: 0.31, sy: 0.23, px: 0, py: 1 },
    { id: "d2", a: 6, b: 4, hue: 160, sx: 0.19, sy: 0.27, px: 2, py: 0.5 },
    { id: "d3", a: 13, b: 9, hue: 25, sx: 0.23, sy: 0.17, px: 4, py: 3 },
  ];
  h.me({ id: "me", a: 22, b: 1, hue: 200 });
  h.count(bots.length + 1);
  const t0 = performance.now();
  const timer = window.setInterval(() => {
    if (!cursorsOn()) return;
    const t = (performance.now() - t0) / 1000;
    for (const b of bots)
      h.move({
        ...b,
        x: 0.5 + 0.38 * Math.sin(t * b.sx + b.px),
        y: scrollY + innerHeight * (0.5 + 0.38 * Math.sin(t * b.sy + b.py)),
      });
  }, 120);
  return {
    setCursors(on) {
      if (!on) h.reset();
    },
    stop() {
      clearInterval(timer);
    },
  };
}
