import { useEffect, useState } from "preact/hooks";
import { timeZone } from "../lib/tz";
import { EGGS, seasonStamp } from "../../shared/stamps";
import { api, currentMe, refreshMe } from "../blog/api";

const KEY = "snak-eggs";
export const STAMP_EVENT = "snak-stamp";
export const PASSPORT_EVENT = "snak-passport";

export type Earned = { code: string; created: number };

const read = (): Record<string, number> => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, number>;
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
};
const write = (v: Record<string, number>) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // private mode: stamps last until the page is closed
  }
};

let mem: Record<string, number> | null = null;
const local = () => (mem ??= read());

const sendable = () => Object.keys(local()).filter((c) => EGGS.has(c) || c.startsWith("s:"));

let timer = 0;
// Saves what this browser found to the signed-in account. Nothing is sent when there is nothing to save.
export const syncStamps = () => {
  if (!sendable().length) return;
  clearTimeout(timer);
  timer = window.setTimeout(async () => {
    await refreshMe();
    const codes = sendable();
    if (currentMe()?.user && codes.length) await api("/api/stamps", "POST", { codes });
  }, 1500);
};
const push = syncStamps;

// Found in the browser and kept there. Signed-in visitors also get it saved on the server.
export function found(code: string) {
  const all = local();
  if (all[code]) return;
  all[code] = Date.now();
  write(all);
  dispatchEvent(new CustomEvent(STAMP_EVENT, { detail: code }));
  push();
}

export const openPassport = () => dispatchEvent(new Event(PASSPORT_EVENT));

export const earnedCount = () => Object.keys(local()).length;

export const seasonNow = () => seasonStamp();

export function useEarned() {
  const [list, setList] = useState<Earned[]>(() =>
    Object.entries(local()).map(([code, created]) => ({ code, created })),
  );
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const merge = (server: Earned[]) => {
      const all = local();
      for (const s of server) all[s.code] ??= s.created;
      write(all);
      setList(Object.entries(all).map(([code, created]) => ({ code, created })));
    };
    const onNew = () => setList(Object.entries(local()).map(([code, created]) => ({ code, created })));
    addEventListener(STAMP_EVENT, onNew);
    void (async () => {
      await refreshMe();
      if (currentMe()?.user) {
        const mine = Object.keys(local()).filter((c) => EGGS.has(c) || c.startsWith("s:"));
        if (mine.length) await api("/api/stamps", "POST", { codes: mine });
      }
      const r = await api<{ stamps: Earned[] }>(`/api/stamps?tz=${encodeURIComponent(timeZone())}`);
      if (r.ok) merge(r.data.stamps);
      setSynced(true);
    })();
    return () => removeEventListener(STAMP_EVENT, onNew);
  }, []);

  return { list, synced };
}
