import { Env, json, limit, requireAdmin } from "../_lib";

const INTERNAL =
  /^(localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[)/i;

type Result = { url: string; status: number; ms: number; note?: string };

async function check(raw: string): Promise<Result | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { url: raw, status: 0, ms: 0, note: "некорректный адрес" };
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  if (INTERNAL.test(url.hostname)) return { url: raw, status: 0, ms: 0, note: "внутренний адрес" };

  const started = Date.now();
  const ask = (method: string) =>
    fetch(url, { method, redirect: "follow", signal: AbortSignal.timeout(6000) });
  try {
    let res = await ask("HEAD");
    if (res.status === 405 || res.status === 501) res = await ask("GET");
    return { url: raw, status: res.status, ms: Date.now() - started };
  } catch {
    return { url: raw, status: 0, ms: Date.now() - started, note: "нет ответа" };
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  if (!(await limit(env, "linkcheck", 6, 60))) return json({ error: "Слишком часто, подождите минуту" }, 429);

  const body = (await request.json().catch(() => ({}))) as { urls?: unknown };
  const urls = [...new Set(Array.isArray(body.urls) ? body.urls : [])]
    .filter((u): u is string => typeof u === "string" && u.length < 300)
    .slice(0, 25);
  const results = (await Promise.all(urls.map(check))).filter((r): r is Result => r !== null);
  return json({ results });
};
