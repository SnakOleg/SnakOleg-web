export async function fetchViews(): Promise<number | null> {
  try {
    const res = await fetch("/api/counter");
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) return null;
    const data = (await res.json()) as { views?: number };
    return typeof data.views === "number" ? data.views : null;
  } catch {
    return null;
  }
}
