export type Surf = { el: Element; l: number; r: number; t: number; rad: number };

export type World = {
  w: number;
  h: number;
  t: number;
  dt: number;
  dark: boolean;
  surfaces: Surf[];
  px: number;
  py: number;
  wind: number;
  density: number;
};

export interface Layer {
  step(w: World): void;
  draw(c: CanvasRenderingContext2D, w: World): void;
}

const MIN_W = 80;
const MIN_H = 24;

// Browsers report colors in several syntaxes (rgb, color(srgb ...), oklch); a 1px canvas reads them all.
let probe: CanvasRenderingContext2D | null = null;
const seen = new Map<string, Uint8ClampedArray>();
const rgba = (color: string) => {
  let v = seen.get(color);
  if (!v) {
    probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = color;
    probe.fillRect(0, 0, 1, 1);
    v = probe.getImageData(0, 0, 1, 1).data;
    seen.set(color, v);
  }
  return v;
};
const alphaOf = (color: string) => rgba(color)[3] / 255;

// Cards, panels and the nav: anything with its own background and rounded corners.
function findSurfaces(): Element[] {
  const found: Element[] = [];
  for (const el of document.querySelectorAll("main *, footer *")) {
    if (found.some((f) => f.contains(el))) continue;
    const box = el.getBoundingClientRect();
    if (box.width < MIN_W || box.height < MIN_H) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || Number(cs.opacity) < 0.5) continue;
    const solid = alphaOf(cs.backgroundColor) > 0.35 || (cs.backdropFilter && cs.backdropFilter !== "none");
    if (solid && parseFloat(cs.borderTopLeftRadius) >= 6) found.push(el);
  }
  return found;
}

const isDark = () => {
  const [r, g, b] = rgba(getComputedStyle(document.body).backgroundColor);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
};

export class Engine {
  private c: CanvasRenderingContext2D;
  private layers: Layer[] = [];
  private els: Element[] = [];
  private raf = 0;
  private last = 0;
  private dpr = 1;
  private world: World;
  private scanTimer = 0;
  private observer: MutationObserver;

  constructor(private canvas: HTMLCanvasElement) {
    this.c = canvas.getContext("2d")!;
    this.world = {
      w: 0,
      h: 0,
      t: 0,
      dt: 0,
      dark: true,
      surfaces: [],
      px: -999,
      py: -999,
      wind: 0,
      density: 1,
    };
    this.observer = new MutationObserver(() => this.scanSoon());
    addEventListener("resize", this.resize);
    addEventListener("pointermove", this.move, { passive: true });
    document.addEventListener("visibilitychange", this.visible);
    this.resize();
  }

  set(layers: Layer[], wind: number, density: number) {
    this.layers = layers;
    this.world.wind = wind;
    this.world.density = density * (innerWidth < 700 ? 0.55 : 1);
    if (layers.length) {
      this.observer.observe(document.querySelector("main") ?? document.body, {
        childList: true,
        subtree: true,
      });
      this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      this.scanSoon(0);
      this.play();
    } else {
      this.observer.disconnect();
      this.pause();
      this.c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  destroy() {
    this.pause();
    this.observer.disconnect();
    clearTimeout(this.scanTimer);
    removeEventListener("resize", this.resize);
    removeEventListener("pointermove", this.move);
    document.removeEventListener("visibilitychange", this.visible);
  }

  private scanSoon(delay = 500) {
    if (this.scanTimer && delay) return;
    clearTimeout(this.scanTimer);
    this.scanTimer = window.setTimeout(() => {
      this.scanTimer = 0;
      this.els = findSurfaces();
      this.world.dark = isDark();
    }, delay);
  }

  private play() {
    if (!this.raf && !document.hidden) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  private pause() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private visible = () => (document.hidden ? this.pause() : this.layers.length && this.play());

  private move = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    this.world.px = e.clientX;
    this.world.py = e.clientY;
  };

  private resize = () => {
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.world.w = innerWidth;
    this.world.h = innerHeight;
    this.canvas.width = Math.round(innerWidth * this.dpr);
    this.canvas.height = Math.round(innerHeight * this.dpr);
    if (this.layers.length) this.scanSoon();
  };

  private frame = (now: number) => {
    const w = this.world;
    if (document.documentElement.classList.contains("zoomed")) {
      this.c.clearRect(0, 0, w.w, w.h);
      this.last = now;
      this.raf = requestAnimationFrame(this.frame);
      return;
    }
    w.dt = Math.min(0.05, (now - this.last) / 1000);
    w.t += w.dt;
    this.last = now;
    w.surfaces = [];
    for (const el of this.els) {
      if (!el.isConnected) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > w.h || r.width < MIN_W) continue;
      w.surfaces.push({ el, l: r.left, r: r.right, t: r.top, rad: Math.min(20, r.width / 4) });
    }
    for (const layer of this.layers) layer.step(w);
    const c = this.c;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, w.w, w.h);
    for (const layer of this.layers) layer.draw(c, w);
    this.raf = requestAnimationFrame(this.frame);
  };
}

// Where a falling point crossed the top edge of a card during this frame.
export function hit(w: World, x: number, prevY: number, y: number) {
  for (const s of w.surfaces)
    if (prevY < s.t && y >= s.t && x > s.l + s.rad * 0.5 && x < s.r - s.rad * 0.5) return s;
  return null;
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
