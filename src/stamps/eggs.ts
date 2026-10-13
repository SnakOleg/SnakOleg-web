import { useEffect } from "preact/hooks";
import { found, seasonNow, syncStamps } from "./client";
import { inDialog } from "../lib/modal";

const NAMES = ["snak", "снак", "oleg", "олег"];
const PAGES = ["home", "uses", "blog"];
const UMBRELLA_MS = 5000;

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      // private mode
    }
  },
  del: (k: string) => {
    try {
      localStorage.removeItem(k);
    } catch {
      // private mode
    }
  },
};

export function useEggs(page: string, raining: boolean) {
  useEffect(() => {
    const seen = new Set((store.get("snak-pages") ?? "").split(",").filter(Boolean));
    seen.add(page);
    store.set("snak-pages", [...seen].join(","));
    if (PAGES.every((p) => seen.has(p))) found("explorer");

    if (store.get("snak-lost")) {
      store.del("snak-lost");
      found("lost");
    }
    if (new Date().getHours() < 5) found("owl");
    syncStamps();
    const season = seasonNow();
    if (season) found(season);

    // The getter runs when the browser console prints the object, so only an open console triggers it.
    const probe = new Image();
    Object.defineProperty(probe, "id", {
      get() {
        found("devtools");
        return "";
      },
    });
    console.log("%cHi, fellow dev. Type `snak` into the terminal (the ` key).", "font-weight:700", probe);
  }, [page]);

  useEffect(() => {
    let typed = "";
    let hiddenAt = 0;
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1 || inDialog()) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]")) return;
      typed = (typed + e.key.toLowerCase()).slice(-5);
      if (NAMES.some((n) => typed.endsWith(n))) found("name");
    };
    const vis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 5000) found("back");
    };
    addEventListener("keydown", key);
    document.addEventListener("visibilitychange", vis);
    return () => {
      removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  useEffect(() => {
    if (!raining || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let last = 0;
    const move = () => (last = Date.now());
    const timer = window.setInterval(() => {
      if (last && !document.hidden && Date.now() - last > UMBRELLA_MS) found("umbrella");
    }, 1000);
    addEventListener("pointermove", move, { passive: true });
    return () => {
      clearInterval(timer);
      removeEventListener("pointermove", move);
    };
  }, [raining]);
}
