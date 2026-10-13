// The shared garden: one plant per visitor, watered once a day until it blooms.
export const PLANTS = ["tulip", "sunflower", "cactus", "tree", "mushroom"] as const;
export type Plant = (typeof PLANTS)[number];
export const MAX_STAGE = 4;
export const isPlant = (v: unknown): v is Plant => (PLANTS as readonly unknown[]).includes(v);

export const CAPSULE_MAX = 500;
export const CAPSULE_ACTIVE = 3;
export const CAPSULE_MIN_MS = 3_600_000;
export const CAPSULE_MAX_MS = 5 * 365 * 86_400_000;
