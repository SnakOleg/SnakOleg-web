export type Peer = { id: string; a: number; b: number; hue: number; x: number; y: number };
export type Me = { id: string; a: number; b: number; hue: number };

const HIDDEN_CLOSE_MS = 60_000;
const SEND_GAP_MS = 80;

const pageKey = () => location.pathname.replace(/\/+$/, "") || "/";

// One socket per tab. It closes while the tab is hidden for a minute and comes back on focus.
export type Handlers = {
  count: (n: number) => void;
  me: (m: Me | null) => void;
  move: (p: Peer) => void;
  gone: (id: string) => void;
  reset: () => void;
};
export type Conn = { setCursors: (on: boolean) => void; stop: () => void };

export function connect(h: Handlers, cursorsOn: () => boolean): Conn {
  let ws: WebSocket | null = null;
  let retry = 0;
  let timer = 0;
  let hiddenTimer = 0;
  let stopped = false;
  let lastSend = 0;
  let lastX = -1;
  let lastY = -1;

  let checked: Promise<boolean> | null = null;
  const available = () =>
    (checked ??= fetch("/api/live", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ live?: boolean }>) : null))
      .then((d) => d?.live === true)
      .catch(() => false));

  const open = async () => {
    if (stopped || ws || document.hidden) return;
    if (!(await available())) return;
    if (stopped || ws || document.hidden) return;
    const url = new URL("/api/live", location.href);
    url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("page", pageKey());
    url.searchParams.set("cursors", cursorsOn() ? "1" : "0");
    const sock = new WebSocket(url);
    ws = sock;
    let ping = 0;
    sock.onopen = () => {
      retry = 0;
      ping = window.setInterval(() => sock.readyState === WebSocket.OPEN && sock.send("ping"), 25_000);
    };
    sock.onmessage = (e) => {
      if (e.data === "pong" || typeof e.data !== "string") return;
      let m: { t: string } & Record<string, unknown>;
      try {
        m = JSON.parse(e.data) as typeof m;
      } catch {
        return;
      }
      if (m.t === "n") h.count(Number(m.n));
      else if (m.t === "hi") h.me(m as unknown as Me);
      else if (m.t === "m") h.move(m as unknown as Peer);
      else if (m.t === "o") h.gone(String(m.id));
    };
    sock.onclose = () => {
      clearInterval(ping);
      if (ws === sock) ws = null;
      h.reset();
      h.count(0);
      if (stopped || document.hidden) return;
      retry = Math.min(retry + 1, 8);
      timer = window.setTimeout(() => void open(), Math.min(2 ** retry * 1000, 5 * 60_000));
    };
  };

  const send = (data: object) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || !cursorsOn()) return;
    const now = performance.now();
    if (now - lastSend < SEND_GAP_MS) return;
    const x = e.clientX / innerWidth;
    const y = e.clientY + scrollY;
    if (Math.abs(e.clientX - lastX) < 2 && Math.abs(y - lastY) < 2) return;
    lastSend = now;
    lastX = e.clientX;
    lastY = y;
    send({ t: "m", x, y, p: pageKey() });
  };
  const onOut = (e: PointerEvent) => {
    if (!e.relatedTarget) send({ t: "o" });
  };
  const onVisible = () => {
    clearTimeout(hiddenTimer);
    if (document.hidden) {
      send({ t: "o" });
      hiddenTimer = window.setTimeout(() => ws?.close(1000), HIDDEN_CLOSE_MS);
    } else {
      clearTimeout(timer);
      void open();
    }
  };

  addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerout", onOut);
  document.addEventListener("visibilitychange", onVisible);
  void open();

  return {
    setCursors(on: boolean) {
      send({ t: "c", on });
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(hiddenTimer);
      removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("visibilitychange", onVisible);
      ws?.close(1000);
    },
  };
}
