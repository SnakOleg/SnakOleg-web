import { useEffect, useState } from "preact/hooks";
import type { Palette } from "../../shared/palette";
import { retroPalette } from "../config/presets";
import { profile } from "../config/profile";
import { applyPalette } from "../lib/palette";

export type Theme = {
  hue: number;
  mode: "auto" | "light" | "dark";
  presets?: boolean;
  palette?: Palette | null;
  label?: string;
  font?: "default" | "onest" | "mono";
};

export function useTheme(retro = false) {
  const [th, setTh] = useState<Theme>(() => {
    try {
      return { ...profile.theme, ...JSON.parse(localStorage.getItem("snak-theme") || "{}") };
    } catch {
      return { ...profile.theme };
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--h", String(th.hue));
    if (th.mode === "auto") root.removeAttribute("data-theme");
    else root.dataset.theme = th.mode;
    if (th.font && th.font !== "default") root.dataset.font = th.font;
    else root.removeAttribute("data-font");
    applyPalette(retro ? retroPalette : (th.palette ?? null));
    try {
      localStorage.setItem("snak-theme", JSON.stringify(th));
    } catch {
      // storage unavailable
    }
  }, [th, retro]);

  return [th, setTh] as const;
}

export const flipMode = (th: Theme): Theme => {
  if (th.palette) return th;
  const dark =
    th.mode === "dark" || (th.mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  return { ...th, mode: dark ? "light" : "dark" };
};
