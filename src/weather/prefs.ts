import { seasonOf } from "../../shared/stamps";
import { useEffect, useState } from "preact/hooks";

export const SKIES = ["auto", "off", "clear", "clouds", "rain", "downpour", "storm", "snow", "fog"] as const;
export const HOLIDAYS = ["auto", "off", "newyear", "halloween", "valentine"] as const;
export type Sky = (typeof SKIES)[number];
export type Holiday = (typeof HOLIDAYS)[number];
export type WxPrefs = { sky: Sky; holiday: Holiday };

const KEY = "snak-weather";
const DEFAULTS: WxPrefs = { sky: "auto", holiday: "auto" };

const read = (): WxPrefs => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<WxPrefs>;
    return {
      sky: SKIES.includes(v.sky as Sky) ? (v.sky as Sky) : DEFAULTS.sky,
      holiday: HOLIDAYS.includes(v.holiday as Holiday) ? (v.holiday as Holiday) : DEFAULTS.holiday,
    };
  } catch {
    return DEFAULTS;
  }
};

export function useWeatherPrefs(): [WxPrefs, (p: WxPrefs) => void] {
  const [p, setP] = useState(read);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      // private mode
    }
  }, [p]);
  return [p, setP];
}

export type Report = { code: number; day: boolean; temp: number; wind: number; city: string };
export type Effect = "clear" | "clouds" | "rain" | "downpour" | "storm" | "snow" | "fog";
export type Plan = { kind: Effect; density: number; wind: number };

// WMO weather codes used by Open-Meteo.
export function planFromCode(code: number, wind: number): Plan {
  const w = Math.min(1.5, Math.max(0, wind / 8));
  const p = (kind: Effect, density: number): Plan => ({ kind, density, wind: w });
  if (code <= 1) return p("clear", 0);
  if (code <= 3) return p("clouds", code === 3 ? 1 : 0.6);
  if (code === 45 || code === 48) return p("fog", 1);
  if (code >= 51 && code <= 57) return p("rain", 0.35);
  if (code === 61 || code === 66 || code === 80) return p("rain", 0.55);
  if (code === 63 || code === 81) return p("rain", 0.9);
  if (code === 65 || code === 67 || code === 82) return p("downpour", 1.2);
  if (code >= 71 && code <= 77) return p("snow", code === 75 ? 1.1 : code === 77 ? 0.35 : 0.7);
  if (code === 85 || code === 86) return p("snow", code === 86 ? 1.1 : 0.6);
  if (code >= 95) return p("storm", code === 95 ? 1 : 1.2);
  return p("clear", 0);
}

export function planFromSky(sky: Exclude<Sky, "auto" | "off">): Plan {
  const density = { clear: 0, clouds: 0.8, rain: 0.8, downpour: 1.3, storm: 1.1, snow: 0.8, fog: 1 }[sky];
  return { kind: sky, density, wind: sky === "storm" || sky === "downpour" ? 0.8 : 0.25 };
}

export const holidayToday = seasonOf;
