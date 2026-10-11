export const KEYS = ["profile", "contacts", "skills", "projects", "uses", "announce", "github", "theme"];
export const LISTS = ["contacts", "projects", "uses", "announce"];
const URL_KEYS = new Set(["href", "url", "avatar", "img"]);
const SAFE_URL = /^(https?:\/\/|\/(?!\/)|mailto:|tg:)/i;

export function validateContent(key: string, value: unknown): string | null {
  if (!KEYS.includes(key)) return "unknown section";
  if (typeof value !== "object" || value === null) return "must be an object or a list";
  if (LISTS.includes(key) !== Array.isArray(value)) return "wrong shape";
  if (JSON.stringify(value).length > 60_000) return "too large";

  const walk = (x: unknown, depth: number): string | null => {
    if (depth > 7) return "too deep";
    if (typeof x === "string") return x.length > 4000 ? "string too long" : null;
    if (Array.isArray(x)) {
      if (x.length > 200) return "list too long";
      for (const item of x) {
        const err = walk(item, depth + 1);
        if (err) return err;
      }
      return null;
    }
    if (x && typeof x === "object") {
      for (const [k, v] of Object.entries(x)) {
        if (k === "__proto__" || k === "constructor" || k === "prototype") return "bad key";
        if (URL_KEYS.has(k) && typeof v === "string" && v && !SAFE_URL.test(v)) return `unsafe ${k}`;
        const err = walk(v, depth + 1);
        if (err) return err;
      }
      return null;
    }
    return ["number", "boolean"].includes(typeof x) || x === null ? null : "bad type";
  };
  return walk(value, 0);
}
