import { deriveVars, isDark } from "../../shared/palette";
import type { Palette } from "../../shared/palette";

const VARS = ["--bg", "--surf", "--ink", "--acc", "--acc2", "--surf2", "--line", "--mut", "--dot"];

export function applyPalette(p: Palette | null) {
  const root = document.documentElement;
  if (!p) {
    VARS.forEach((v) => root.style.removeProperty(v));
    root.style.removeProperty("color-scheme");
    return;
  }
  for (const [name, value] of Object.entries(deriveVars(p))) root.style.setProperty(name, value);
  root.style.setProperty("color-scheme", isDark(p.bg) ? "dark" : "light");
}
