// The shared garden: one plant per visitor, watered once a day until it blooms.
export const PLANTS = [
  "tulip",
  "sunflower",
  "cactus",
  "tree",
  "mushroom",
  "rose",
  "pumpkin",
  "lavender",
] as const;
export type Plant = (typeof PLANTS)[number];
export const MAX_STAGE = 4;
export const isPlant = (v: unknown): v is Plant => (PLANTS as readonly unknown[]).includes(v);

export const LOCS = ["meadow", "pond", "orchard", "forest"] as const;
export type Loc = (typeof LOCS)[number];
export const isLoc = (v: unknown): v is Loc => (LOCS as readonly unknown[]).includes(v);

// Flower colours a visitor can pick; index 0 is the plant's own colour.
export const COLORS = ["", "#e0467a", "#f4c430", "#9b7fd6", "#ff8a5b", "#4fa3d1", "#f7f2e8"] as const;
export const DECOS = ["", "sign", "gnome", "lantern", "pinwheel", "birdhouse", "fence"] as const;
export type Deco = (typeof DECOS)[number];
export const isDeco = (v: unknown): v is Deco => (DECOS as readonly unknown[]).includes(v);

export const GIFTS_PER_DAY = 5;

export const CAPSULE_MAX = 500;
export const CAPSULE_ACTIVE = 3;
export const CAPSULE_LIFETIME = 12;
export const CAPSULE_BAY = 48;
export const CAPSULE_MIN_MS = 3_600_000;
export const CAPSULE_MAX_MS = 5 * 365 * 86_400_000;
