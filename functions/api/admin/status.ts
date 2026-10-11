import { Env, json, localDay, requireAdmin, statsZone } from "../_lib";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const today = localDay(env);
  const [counts, last, sections, login, sessions, pending] = await Promise.all([
    env.DB.prepare(
      "SELECT metric,SUM(n) n FROM agg WHERE day=? AND metric IN ('views','visitors') GROUP BY metric",
    )
      .bind(today)
      .all<{ metric: string; n: number }>(),
    env.DB.prepare("SELECT MAX(day) d FROM agg").first<{ d: string | null }>(),
    env.DB.prepare("SELECT key,version,updated_at FROM content").all(),
    env.DB.prepare("SELECT ts FROM audit WHERE action='login' ORDER BY id DESC LIMIT 1 OFFSET 1").first<{
      ts: number;
    }>(),
    env.DB.prepare("SELECT COUNT(*) n FROM sessions WHERE revoked=0 AND seen > ?")
      .bind(Date.now() - 8 * 3600_000)
      .first<{ n: number }>(),
    env.DB.prepare("SELECT COUNT(*) n FROM presets WHERE status='pending'").first<{ n: number }>(),
  ]);

  const by = Object.fromEntries(counts.results.map((r) => [r.metric, r.n]));
  return json({
    zone: statsZone(env),
    today: { views: by.views ?? 0, visitors: by.visitors ?? 0 },
    lastEventDay: last?.d ?? null,
    sections: sections.results,
    previousLogin: login?.ts ?? null,
    activeSessions: sessions?.n ?? 0,
    pendingPresets: pending?.n ?? 0,
    env: {
      telegram: Boolean(env.TG_CLIENT_ID && env.TG_CLIENT_SECRET),
      secret: (env.SESSION_SECRET ?? "").length >= 32,
      admin: Boolean(env.ADMIN_TG_ID),
      notifications: Boolean(env.TG_BOT_TOKEN),
    },
  });
};
