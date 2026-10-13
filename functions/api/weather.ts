import { ZONES } from "./_zones";
import { Env, geo, json, trustedCountry } from "./_lib";

// Coordinates come from Cloudflare (the visitor's city). If the browser time zone disagrees with it (a VPN), the zone wins.
// The visitor's address is not passed on: Open-Meteo only sees our server and rounded coordinates.

type Current = { temperature_2m: number; weather_code: number; is_day: number; wind_speed_10m: number };

const FALLBACK = { lat: 59.94, lon: 30.31, city: "Saint Petersburg" };
const TTL = 900;

export const onRequestGet: PagesFunction<Env> = async ({ request, waitUntil }) => {
  const cf = (request.cf ?? {}) as Record<string, string | undefined>;
  const lat = Number(cf.latitude);
  const lon = Number(cf.longitude);
  const known = Number.isFinite(lat) && Number.isFinite(lon) && !!cf.latitude;
  const tz = new URL(request.url).searchParams.get("tz") ?? "";
  const zone = !trustedCountry(request, tz) ? ZONES[tz] : undefined;
  const at = zone
    ? { lat: zone[0], lon: zone[1], city: tz.split("/").pop()!.replace(/_/g, " ") }
    : known
      ? { lat: Math.round(lat * 10) / 10, lon: Math.round(lon * 10) / 10, city: geo(request).city }
      : FALLBACK;

  const key = new Request(`https://weather.cache/${at.lat}/${at.lon}`);
  const cache = caches.default;
  let res = await cache.match(key);
  if (!res) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(at.lat));
    url.searchParams.set("longitude", String(at.lon));
    url.searchParams.set("current", "temperature_2m,weather_code,is_day,wind_speed_10m");
    url.searchParams.set("wind_speed_unit", "ms");
    const up = await fetch(url, { signal: AbortSignal.timeout(4000) }).catch(() => null);
    if (!up?.ok) return json({ error: "unavailable" }, 503);
    const data = (await up.json()) as { current?: Current };
    if (!data.current) return json({ error: "unavailable" }, 503);
    res = new Response(JSON.stringify(data.current), {
      headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${TTL}` },
    });
    waitUntil(cache.put(key, res.clone()));
  }
  const c = (await res.json()) as Current;
  return json(
    {
      code: c.weather_code,
      day: c.is_day === 1,
      temp: Math.round(c.temperature_2m),
      wind: c.wind_speed_10m,
      city: at.city,
    },
    200,
    { "Cache-Control": "private, max-age=600" },
  );
};
