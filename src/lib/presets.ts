import { normalize } from "../../shared/palette";
import type { Palette } from "../../shared/palette";

export type Community = { id: number; name: string; author: string; comment: string; palette: Palette };
export type SuggestResult =
  "ok" | "duplicate" | "full" | "many" | "closed" | "invalid" | "error" | "login" | "banned";

let cache: Community[] | null = null;

export async function fetchCommunity(): Promise<Community[]> {
  if (cache) return cache;
  try {
    const res = await fetch("/api/presets");
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) return [];
    const data = (await res.json()) as { presets?: Community[] };
    cache = (data.presets ?? []).flatMap((p) => {
      const palette = normalize(p.palette);
      return palette ? [{ ...p, palette }] : [];
    });
    return cache;
  } catch {
    return [];
  }
}

export async function suggest(body: {
  name: string;
  author: string;
  comment: string;
  palette: Palette;
}): Promise<SuggestResult> {
  try {
    const res = await fetch("/api/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "snak" },
      body: JSON.stringify(body),
    });
    if (res.status === 201) return "ok";
    if (res.status === 409) return "duplicate";
    if (res.status === 401) return "login";
    if (res.status === 403) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return body.error === "banned" ? "banned" : "closed";
    }
    if (res.status === 400) return "invalid";
    if (res.status === 429)
      return ((await res.json().catch(() => ({}))) as { error?: string }).error === "full" ? "full" : "many";
    return "error";
  } catch {
    return "error";
  }
}
