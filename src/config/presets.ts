import { t, T } from "./i18n";
import type { Palette } from "../../shared/palette";

export type Preset = { id: string; name: T; palette: Palette };

// Ready-made palettes. The default look has no palette: it follows the hue slider and the system theme.
export const presets: Preset[] = [
  {
    id: "graphite",
    name: t("Графит", "Graphite"),
    palette: { bg: "#17181b", surf: "#212227", ink: "#ececf0", acc: "#8ab4ff", acc2: "#c792ea" },
  },
  {
    id: "paper",
    name: t("Бумага", "Paper"),
    palette: { bg: "#f2ecdf", surf: "#fbf7ee", ink: "#2b2620", acc: "#a8481a", acc2: "#2f6a8c" },
  },
  {
    id: "mint",
    name: t("Мята", "Mint"),
    palette: { bg: "#e6f1ec", surf: "#f3faf6", ink: "#1b3329", acc: "#17795a", acc2: "#2f68b8" },
  },
  {
    id: "sunset",
    name: t("Закат", "Sunset"),
    palette: { bg: "#1d1419", surf: "#2a1d24", ink: "#f6ebf0", acc: "#ff8a5c", acc2: "#ff6b9a" },
  },
  {
    id: "cyber",
    name: t("Киберпанк", "Cyberpunk"),
    palette: { bg: "#0b0b14", surf: "#14142a", ink: "#e8f0ff", acc: "#00f0ff", acc2: "#ff2bd6" },
  },
];

// Used by the 2003 mode, it overrides any other theme while the mode is on.
export const retroPalette: Palette = {
  bg: "#05010f",
  surf: "#0d0221",
  ink: "#d6fff5",
  acc: "#00ffd0",
  acc2: "#ff2bd6",
};
