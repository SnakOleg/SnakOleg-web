import type { T } from "./i18n";

// Site-wide notices. Edited in the admin ("Объявления"); nothing is shown while the list is empty.
export type Announce = {
  on: boolean;
  style: "ticker" | "banner" | "modal";
  tone: "info" | "warn" | "ok";
  text: T;
  href: string;
  label: T;
  /** ISO date or datetime; empty = no limit */
  from: string;
  to: string;
};

export const announce: Announce[] = [];
