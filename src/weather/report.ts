import { useEffect, useState } from "preact/hooks";
import type { Report } from "./prefs";
import { timeZone } from "../lib/tz";

const DEMO = Boolean(import.meta.env.VITE_DEMO || import.meta.env.VITE_BLOG_DEMO);
const KEY = "snak-wx-report";
const FRESH_MS = 20 * 60_000;

type Stored = { at: number; r: Report };

// Asked once per 20 minutes per tab; demo builds have no backend.
export function useReport(wanted: boolean) {
  const [report, setReport] = useState<Report | null | "none">(null);
  useEffect(() => {
    if (!wanted || report) return;
    if (DEMO) return setReport({ code: 63, day: true, temp: 7, wind: 4, city: "Санкт-Петербург" });
    try {
      const s = JSON.parse(sessionStorage.getItem(KEY) || "null") as Stored | null;
      if (s && Date.now() - s.at < FRESH_MS) return setReport(s.r);
    } catch {
      // ignore broken cache
    }
    let live = true;
    void fetch(`/api/weather?tz=${encodeURIComponent(timeZone())}`)
      .then((r) => (r.ok ? (r.json() as Promise<Report>) : null))
      .catch(() => null)
      .then((r) => {
        if (!live) return;
        setReport(r ?? "none");
        if (r)
          try {
            sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), r }));
          } catch {
            // private mode
          }
      });
    return () => {
      live = false;
    };
  }, [wanted]);
  return report;
}
