const KEY = "snak-clicked";
const counted = new Set<string>();

const enabled = () => !(navigator.doNotTrack === "1" || location.hostname === "localhost");

const send = (payload: object) => {
  try {
    const data = JSON.stringify(payload);
    if (!navigator.sendBeacon?.("/api/track", new Blob([data], { type: "text/plain" }))) {
      void fetch("/api/track", { method: "POST", body: data, keepalive: true }).catch(() => undefined);
    }
  } catch {
    // tracking must never break the page
  }
};

function firstTime(name: string) {
  let known: string[] = [];
  try {
    known = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
  } catch {
    // no storage
  }
  if (known.includes(name) || counted.has(name)) return false;
  counted.add(name);
  try {
    sessionStorage.setItem(KEY, JSON.stringify([...known, name]));
  } catch {
    // no storage
  }
  return true;
}

export function startTracking() {
  if (!enabled()) return;
  try {
    if (!sessionStorage.getItem("pv")) {
      sessionStorage.setItem("pv", "1");
      send({ t: "pv", p: location.pathname, r: document.referrer, l: document.documentElement.lang });
    }
  } catch {
    // no storage
  }
  document.addEventListener("click", (e) => {
    if (!e.isTrusted) return;
    const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!link || link.origin === location.origin) return;
    const name = link.href
      .replace(/^[a-z]+:\/\/(www\.)?/, "")
      .replace(/\/$/, "")
      .slice(0, 70);
    if (firstTime(name)) send({ t: "click", n: name });
  });
}
