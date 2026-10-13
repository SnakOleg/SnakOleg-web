// Postcards in the guestbook: a short text, one of these stamps and the sender's country.
export const CARD_ICONS = ["sun", "cloud", "star", "heart", "coffee", "plane", "flower", "cat"] as const;
export type CardIcon = (typeof CARD_ICONS)[number];
export const CARD_MAX = 140;

export type Card = { icon: CardIcon; c: string };

// Cloudflare reports XX for unknown and T1 for Tor.
export const countryOk = (c: unknown): c is string =>
  typeof c === "string" && /^[A-Z]{2}$/.test(c) && c !== "XX" && c !== "T1";

export function parseCard(raw: unknown): Card | null {
  try {
    const v = (typeof raw === "string" ? JSON.parse(raw) : raw) as { icon?: unknown; c?: unknown } | null;
    if (!v || !(CARD_ICONS as readonly unknown[]).includes(v.icon)) return null;
    return { icon: v.icon as CardIcon, c: countryOk(v.c) ? v.c : "" };
  } catch {
    return null;
  }
}
