import { NOW_TTL_MS } from "../../shared/now";
import type { NowState } from "../../shared/now";
import { Env, json } from "./_lib";

export const getNow = async (env: Env): Promise<NowState | null> => {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='now'").first<{ value: string }>();
  if (!row) return null;
  try {
    const v = JSON.parse(row.value) as NowState;
    return typeof v.ts === "number" && Date.now() - v.ts < NOW_TTL_MS ? v : null;
  } catch {
    return null;
  }
};

export const setNow = (env: Env, v: NowState | null) =>
  v
    ? env.DB.prepare(
        "INSERT INTO settings(key,value) VALUES('now',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
        .bind(JSON.stringify(v))
        .run()
    : env.DB.prepare("DELETE FROM settings WHERE key='now'").run();

export const onRequestGet: PagesFunction<Env> = async ({ env }) =>
  json({ now: await getNow(env) }, 200, { "Cache-Control": "public, max-age=60" });
