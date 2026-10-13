import { Env, geo, localDay, localHour, sha256, shiftDay, trustedCountry } from "./_lib";

const BOT = /bot|crawl|spider|slurp|headless|preview|lighthouse|monitor/i;
const LINK = /^[a-z0-9][a-z0-9.\-_~:/@%+#?=&]*$/;

// Limits keep one visitor from skewing the numbers and keep D1 writes far below the free daily quota.
const LIMIT = {
  viewsPerDay: 4000,
  viewsPerVisitor: 20,
  clicksPerDay: 3000,
  linksPerVisitor: 40,
  linkNames: 200,
};

const none = () => new Response(null, { status: 204 });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ua = request.headers.get("User-Agent") ?? "";
  const self = new URL(request.url);
  const origin = request.headers.get("Origin");
  const sameSite = origin ? origin === self.origin : request.headers.get("Sec-Fetch-Site") === "same-origin";
  if (!ua || BOT.test(ua) || !sameSite) return none();

  let body: { t?: string; p?: string; r?: string; l?: string; n?: string; z?: string };
  try {
    const text = await request.text();
    if (text.length > 1000) return none();
    body = JSON.parse(text);
  } catch {
    return none();
  }

  const day = localDay(env);
  const vid = (await sha256(`${env.SESSION_SECRET}|${day}|${geo(request).ip}|${ua}`)).slice(0, 16);
  const count = (metric: string, key: string) =>
    env.DB.prepare(
      "INSERT INTO agg(day,metric,key,n) VALUES(?1,?2,?3,1) ON CONFLICT(day,metric,key) DO UPDATE SET n=n+1",
    ).bind(day, metric, key.slice(0, 80));

  if (body.t === "pv") {
    const total = await env.DB.prepare("SELECT n FROM agg WHERE day=?1 AND metric='views' AND key=''")
      .bind(day)
      .first<{ n: number }>();
    if ((total?.n ?? 0) >= LIMIT.viewsPerDay) return none();

    // The same row tells how many views this visitor already made today (RETURNING needs SQLite 3.35+).
    const seen = await env.DB.prepare(
      "INSERT INTO seen(day,vid,views) VALUES(?1,?2,1) ON CONFLICT(day,vid) DO UPDATE SET views=views+1 RETURNING views",
    )
      .bind(day, vid)
      .first<{ views: number }>();
    if (!seen || seen.views > LIMIT.viewsPerVisitor) return none();

    let ref = "direct";
    try {
      const host = new URL(String(body.r)).host;
      if (host && host !== self.host) ref = host.replace(/^www\./, "");
    } catch {
      // no referrer
    }
    const device = /ipad|tablet/i.test(ua)
      ? "tablet"
      : /mobi|android|iphone/i.test(ua)
        ? "mobile"
        : "desktop";
    const country = trustedCountry(request, body.z) ?? "??";

    const batch = [
      count("views", ""),
      count("path", String(body.p ?? "/").split("?")[0]),
      count("ref", ref),
      count("country", country),
      count("device", device),
      count("lang", body.l === "en" ? "en" : "ru"),
      count("hour", String(localHour(env)).padStart(2, "0")),
    ];
    if (seen.views === 1) batch.push(count("visitors", ""));
    if (Math.random() < 0.1) {
      const old = shiftDay(day, -2);
      batch.push(
        env.DB.prepare("DELETE FROM seen WHERE day<?").bind(old),
        env.DB.prepare("DELETE FROM clicked WHERE day<?").bind(old),
      );
    }
    await env.DB.batch(batch).catch(() => undefined);
    return none();
  }

  if (body.t === "click" && typeof body.n === "string") {
    const link = body.n.trim().toLowerCase().slice(0, 70);
    if (!LINK.test(link)) return none();

    const [daily, mine] = await Promise.all([
      env.DB.prepare("SELECT COALESCE(SUM(n),0) n FROM agg WHERE day=?1 AND metric='click'")
        .bind(day)
        .first<{ n: number }>(),
      env.DB.prepare("SELECT COUNT(*) n FROM clicked WHERE day=?1 AND vid=?2")
        .bind(day, vid)
        .first<{ n: number }>(),
    ]);
    if ((daily?.n ?? 0) >= LIMIT.clicksPerDay || (mine?.n ?? 0) >= LIMIT.linksPerVisitor) return none();

    // A made-up link name must not be able to create endless new rows.
    const known = await env.DB.prepare("SELECT 1 FROM agg WHERE day=?1 AND metric='click' AND key=?2")
      .bind(day, link)
      .first();
    if (!known) {
      const names = await env.DB.prepare("SELECT COUNT(*) n FROM agg WHERE day=?1 AND metric='click'")
        .bind(day)
        .first<{ n: number }>();
      if ((names?.n ?? 0) >= LIMIT.linkNames) return none();
    }

    // One visitor, one link, one count per day: repeated taps change nothing.
    const fresh = await env.DB.prepare("INSERT OR IGNORE INTO clicked(day,vid,link) VALUES(?1,?2,?3)")
      .bind(day, vid, link)
      .run();
    if (fresh.meta.changes > 0) await count("click", link).run();
  }
  return none();
};
