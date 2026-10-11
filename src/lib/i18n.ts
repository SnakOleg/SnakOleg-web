import type { T } from "../config";

export type L = "ru" | "en";

export const tx = (v: string | T, l: L) => (typeof v === "string" ? v : v[l]);

export const fmt = (iso: string, l: L, full = false) =>
  new Date(iso).toLocaleDateString(l === "ru" ? "ru-RU" : "en-US", {
    timeZone: "UTC",
    ...(full ? { day: "numeric", month: "short", year: "numeric" } : { month: "short", year: "numeric" }),
  });

const ruForm = (n: number) => {
  if (n % 10 === 1 && n % 100 !== 11) return 0;
  return n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 1 : 2;
};

export const plural = (n: number, l: L, ru: [string, string, string], en: [string, string]) =>
  l === "en" ? (n === 1 ? en[0] : en[1]) : ru[ruForm(n)];

export const commitsWord = (n: number, l: L) =>
  plural(n, l, ["коммит", "коммита", "коммитов"], ["commit", "commits"]);
