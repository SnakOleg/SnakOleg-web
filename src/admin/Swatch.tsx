import type { Palette } from "../../shared/palette";

export const KEYS_ORDER = ["bg", "surf", "ink", "acc", "acc2"] as const;

export function Swatch({ palette }: { palette: Palette }) {
  return (
    <span class="swatch" aria-hidden="true">
      {KEYS_ORDER.map((k) => (
        <i style={{ background: palette[k] }} />
      ))}
    </span>
  );
}
