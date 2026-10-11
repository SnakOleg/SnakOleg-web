export type Palette = { bg: string; surf: string; ink: string; acc: string; acc2: string };

export const PALETTE_KEYS = ["bg", "surf", "ink", "acc", "acc2"] as const;

const HEX = /^#[0-9a-f]{6}$/i;

// Share of the text color in the secondary text color.
const MUTED = 0.72;

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};

export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Weight is the share of the first color.
export const mix = (a: string, b: string, weight: number) => {
  const [pa, pb] = [parseInt(a.slice(1), 16), parseInt(b.slice(1), 16)];
  const part = (shift: number) =>
    Math.round(((pa >> shift) & 255) * weight + ((pb >> shift) & 255) * (1 - weight))
      .toString(16)
      .padStart(2, "0");
  return `#${part(16)}${part(8)}${part(0)}`;
};

export const isDark = (bg: string) => luminance(bg) < 0.25;

export const normalize = (value: unknown): Palette | null => {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of PALETTE_KEYS) {
    const color = source[key];
    if (typeof color !== "string" || !HEX.test(color)) return null;
    out[key] = color.toLowerCase();
  }
  return out as Palette;
};

// Returns a short code for the first problem, or null when the colors are safe to use.
export function validatePalette(value: unknown): string | null {
  const p = normalize(value);
  if (!p) return "colors";
  const muted = mix(p.ink, p.bg, MUTED);
  if (contrast(p.ink, p.bg) < 4.5 || contrast(p.ink, p.surf) < 4.5) return "text";
  if (contrast(muted, p.bg) < 4.5 || contrast(muted, p.surf) < 4.5) return "muted";
  if (contrast(p.acc, p.bg) < 4.5) return "accent";
  return null;
}

export const deriveVars = (p: Palette): Record<string, string> => ({
  "--bg": p.bg,
  "--surf": p.surf,
  "--ink": p.ink,
  "--acc": p.acc,
  "--acc2": p.acc2,
  "--surf2": mix(p.ink, p.surf, 0.07),
  "--line": mix(p.ink, p.surf, 0.16),
  "--mut": mix(p.ink, p.bg, MUTED),
  "--dot": mix(p.ink, p.bg, 0.12),
});
