import { hit, rand } from "./engine";
import type { Layer, World } from "./engine";

type Drop = { x: number; y: number; vx: number; vy: number; len: number };
type Bit = { x: number; y: number; vx: number; vy: number; life: number; r: number };

const splashInto = (bits: Bit[], x: number, y: number, n: number) => {
  for (let i = 0; i < n; i++)
    bits.push({
      x,
      y: y - 1,
      vx: rand(-110, 110),
      vy: rand(-240, -110),
      life: rand(0.25, 0.45),
      r: rand(0.8, 1.5),
    });
};

const stepBits = (bits: Bit[], dt: number) => {
  for (let i = bits.length - 1; i >= 0; i--) {
    const b = bits[i];
    b.vy += 900 * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) bits.splice(i, 1);
  }
};

export function rain(heavy: boolean): Layer {
  const drops: Drop[] = [];
  const bits: Bit[] = [];
  const max = heavy ? 520 : 320;
  let due = 0;
  return {
    step(w) {
      due += (heavy ? 420 : 240) * w.density * (w.w / 1000) * w.dt;
      while (due >= 1) {
        due--;
        if (drops.length >= max) continue;
        const vy = heavy ? rand(1150, 1500) : rand(800, 1100);
        drops.push({
          x: rand(-60, w.w + 60),
          y: rand(-80, -10),
          vx: w.wind * rand(120, 220),
          vy,
          len: rand(12, heavy ? 26 : 20),
        });
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        const py = d.y;
        d.x += d.vx * w.dt;
        d.y += d.vy * w.dt;
        const top = hit(w, d.x, py, d.y);
        const umbrella = w.py > 0 && py < w.py - 28 && d.y >= w.py - 28 && Math.abs(d.x - w.px) < 36;
        if ((top && Math.random() < 0.78) || umbrella) {
          splashInto(bits, d.x, top ? top.t : w.py - 28, heavy ? 3 : 2);
          drops.splice(i, 1);
        } else if (d.y > w.h + 30) drops.splice(i, 1);
      }
      stepBits(bits, w.dt);
    },
    draw(c, w) {
      c.strokeStyle = w.dark ? "rgba(190, 205, 255, 0.5)" : "rgba(60, 75, 135, 0.45)";
      c.lineWidth = heavy ? 1.5 : 1.2;
      c.lineCap = "round";
      c.beginPath();
      for (const d of drops) {
        const k = d.len / d.vy;
        c.moveTo(d.x, d.y);
        c.lineTo(d.x - d.vx * k, d.y - d.len);
      }
      c.stroke();
      c.fillStyle = w.dark ? "rgba(200, 215, 255, 0.55)" : "rgba(70, 85, 140, 0.45)";
      for (const b of bits) c.fillRect(b.x, b.y, b.r, b.r);
    },
  };
}

type Flake = { x: number; y: number; r: number; vy: number; ph: number; sw: number };
type Cap = { width: number; h: Float32Array };
const BIN = 4;
const CAP_MAX = 7;

export function snow(): Layer {
  const flakes: Flake[] = [];
  const caps = new Map<Element, Cap>();
  let due = 0;
  return {
    step(w) {
      due += 45 * w.density * (w.w / 1000) * w.dt;
      while (due >= 1) {
        due--;
        if (flakes.length < 300)
          flakes.push({
            x: rand(-20, w.w + 20),
            y: rand(-30, -5),
            r: rand(1.2, 3.4),
            vy: rand(28, 70),
            ph: rand(0, 6.3),
            sw: rand(10, 32),
          });
      }
      for (let i = flakes.length - 1; i >= 0; i--) {
        const f = flakes[i];
        const py = f.y;
        f.x += (Math.sin(w.t * 0.9 + f.ph) * f.sw + w.wind * 40) * w.dt;
        f.y += f.vy * (f.r / 2.4) * w.dt;
        const dx = f.x - w.px;
        const dy = f.y - w.py;
        const d2 = dx * dx + dy * dy;
        if (d2 < 3600 && d2 > 1) {
          const d = Math.sqrt(d2);
          f.x += (dx / d) * 90 * w.dt;
          f.y += (dy / d) * 40 * w.dt;
        }
        const top = hit(w, f.x, py, f.y);
        if (top && Math.random() < 0.55) {
          const width = top.r - top.l;
          let cap = caps.get(top.el);
          if (!cap || Math.abs(cap.width - width) > BIN) {
            cap = { width, h: new Float32Array(Math.ceil(width / BIN) + 1) };
            caps.set(top.el, cap);
          }
          const at = Math.round((f.x - top.l) / BIN);
          for (let k = -3; k <= 3; k++) {
            const j = at + k;
            if (j < 0 || j >= cap.h.length) continue;
            const edge = Math.min(j * BIN, width - j * BIN) / top.rad;
            const limit = CAP_MAX * Math.min(1, Math.max(0, edge));
            cap.h[j] = Math.min(limit, cap.h[j] + f.r * 0.35 * (1 - Math.abs(k) / 4));
          }
          flakes.splice(i, 1);
        } else if (f.y > w.h + 10) flakes.splice(i, 1);
      }
      for (const cap of caps.values())
        for (let j = 0; j < cap.h.length; j++) cap.h[j] = Math.max(0, cap.h[j] - 0.04 * w.dt);
    },
    draw(c, w) {
      c.fillStyle = "rgba(255, 255, 255, 0.92)";
      if (!w.dark) {
        c.shadowColor = "rgba(60, 60, 110, 0.35)";
        c.shadowBlur = 3;
      }
      c.beginPath();
      for (const f of flakes) {
        c.moveTo(f.x + f.r, f.y);
        c.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      }
      c.fill();
      for (const s of w.surfaces) {
        const cap = caps.get(s.el);
        if (!cap) continue;
        c.beginPath();
        c.moveTo(s.l, s.t + 0.5);
        for (let j = 0; j < cap.h.length; j++) c.lineTo(s.l + j * BIN, s.t + 0.5 - cap.h[j]);
        c.lineTo(s.r, s.t + 0.5);
        c.closePath();
        c.fill();
      }
      c.shadowBlur = 0;
    },
  };
}

type Puff = { x: number; y: number; r: number; vx: number; a: number };

function drifting(
  count: number,
  band: [number, number],
  size: [number, number],
  alpha: (w: World) => [string, number],
  flat = 1,
): Layer {
  const puffs: Puff[] = [];
  return {
    step(w) {
      if (!puffs.length)
        for (let i = 0; i < count; i++)
          puffs.push({
            x: rand(-200, w.w),
            y: rand(band[0], band[1]) * w.h,
            r: rand(size[0], size[1]),
            vx: rand(5, 16),
            a: rand(0.5, 1),
          });
      for (const p of puffs) {
        p.x += (p.vx + w.wind * 20) * w.dt;
        if (p.x - p.r > w.w) {
          p.x = -p.r;
          p.y = rand(band[0], band[1]) * w.h;
        }
      }
    },
    draw(c, w) {
      const [rgb, base] = alpha(w);
      for (const p of puffs) {
        const g = c.createRadialGradient(0, 0, 0, 0, 0, p.r);
        g.addColorStop(0, `rgba(${rgb}, ${base * p.a * Math.min(1, w.density)})`);
        g.addColorStop(1, `rgba(${rgb}, 0)`);
        c.fillStyle = g;
        c.save();
        c.translate(p.x, p.y);
        c.scale(1, flat);
        c.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
        c.restore();
      }
    },
  };
}

export const fog = () =>
  drifting(9, [0.1, 0.95], [220, 420], (w) => (w.dark ? ["205, 210, 230", 0.09] : ["255, 255, 255", 0.42]));

export const clouds = () =>
  drifting(
    8,
    [0.02, 0.3],
    [160, 300],
    (w) => (w.dark ? ["200, 205, 235", 0.035] : ["255, 255, 255", 0.6]),
    0.45,
  );

export function lightning(): Layer {
  let next = rand(3, 8);
  let flash = 0;
  let bolt: [number, number][] = [];
  return {
    step(w) {
      next -= w.dt;
      if (next <= 0) {
        next = rand(6, 14);
        flash = 1;
        let x = rand(0.15, 0.85) * w.w;
        let y = 0;
        bolt = [[x, y]];
        while (y < w.h * rand(0.45, 0.7)) {
          x += rand(-40, 40);
          y += rand(25, 55);
          bolt.push([x, y]);
        }
      }
      flash = Math.max(0, flash - w.dt * 2.6);
    },
    draw(c, w) {
      if (flash <= 0) return;
      const f = flash > 0.55 ? 1 : flash > 0.4 ? 0.3 : flash;
      c.fillStyle = `rgba(235, 240, 255, ${f * (w.dark ? 0.16 : 0.35)})`;
      c.fillRect(0, 0, w.w, w.h);
      c.strokeStyle = `rgba(255, 255, 255, ${f})`;
      c.shadowColor = "rgba(170, 190, 255, 0.9)";
      c.shadowBlur = 14;
      c.lineWidth = 2;
      c.beginPath();
      bolt.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
      c.shadowBlur = 0;
    },
  };
}

type Bat = { x: number; y: number; vx: number; ph: number; s: number; amp: number };

export function bats(): Layer {
  const list: Bat[] = [];
  let next = rand(1, 3);
  return {
    step(w) {
      next -= w.dt;
      if (next <= 0) {
        next = rand(3, 8);
        const n = Math.floor(rand(1, 4));
        const right = Math.random() < 0.5;
        for (let i = 0; i < n; i++)
          list.push({
            x: right ? -40 - i * 50 : w.w + 40 + i * 50,
            y: rand(0.08, 0.5) * w.h,
            vx: (right ? 1 : -1) * rand(120, 200),
            ph: rand(0, 6.3),
            s: rand(10, 18),
            amp: rand(20, 50),
          });
      }
      for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i];
        b.x += b.vx * w.dt;
        b.y += Math.sin(w.t * 2.2 + b.ph) * b.amp * w.dt;
        if (b.x < -120 || b.x > w.w + 120) list.splice(i, 1);
      }
    },
    draw(c, w) {
      c.fillStyle = w.dark ? "rgba(190, 160, 255, 0.55)" : "rgba(25, 15, 40, 0.8)";
      for (const b of list) {
        const flap = Math.sin(w.t * 16 + b.ph);
        const s = b.s;
        const wy = -flap * s * 0.7;
        c.beginPath();
        c.moveTo(b.x, b.y);
        c.quadraticCurveTo(b.x - s * 0.6, b.y + wy - s * 0.2, b.x - s * 1.4, b.y + wy);
        c.quadraticCurveTo(b.x - s * 0.9, b.y + s * 0.2, b.x - s * 0.5, b.y + s * 0.35);
        c.lineTo(b.x, b.y + s * 0.3);
        c.lineTo(b.x + s * 0.5, b.y + s * 0.35);
        c.quadraticCurveTo(b.x + s * 0.9, b.y + s * 0.2, b.x + s * 1.4, b.y + wy);
        c.quadraticCurveTo(b.x + s * 0.6, b.y + wy - s * 0.2, b.x, b.y);
        c.fill();
        c.beginPath();
        c.ellipse(b.x, b.y + s * 0.12, s * 0.22, s * 0.3, 0, 0, Math.PI * 2);
        c.fill();
      }
    },
  };
}

type Heart = { x: number; y: number; s: number; vy: number; ph: number; hue: number };

export function hearts(): Layer {
  const list: Heart[] = [];
  let due = 0;
  return {
    step(w) {
      due += 2.2 * (w.w / 1000) * w.dt;
      while (due >= 1) {
        due--;
        list.push({
          x: rand(0, w.w),
          y: w.h + 20,
          s: rand(7, 15),
          vy: rand(30, 60),
          ph: rand(0, 6.3),
          hue: rand(330, 360),
        });
      }
      for (let i = list.length - 1; i >= 0; i--) {
        const h = list[i];
        h.y -= h.vy * w.dt;
        h.x += Math.sin(w.t * 1.3 + h.ph) * 18 * w.dt;
        if (h.y < -30) list.splice(i, 1);
      }
    },
    draw(c, w) {
      for (const h of list) {
        const fade = Math.min(1, h.y / (w.h * 0.4));
        c.fillStyle = `hsla(${h.hue}, 85%, 66%, ${0.6 * fade})`;
        const { x, y, s } = h;
        c.beginPath();
        c.moveTo(x, y + s * 0.3);
        c.bezierCurveTo(x, y, x - s * 0.5, y - s * 0.1, x - s * 0.5, y + s * 0.25);
        c.bezierCurveTo(x - s * 0.5, y + s * 0.55, x, y + s * 0.75, x, y + s);
        c.bezierCurveTo(x, y + s * 0.75, x + s * 0.5, y + s * 0.55, x + s * 0.5, y + s * 0.25);
        c.bezierCurveTo(x + s * 0.5, y - s * 0.1, x, y, x, y + s * 0.3);
        c.fill();
      }
    },
  };
}
