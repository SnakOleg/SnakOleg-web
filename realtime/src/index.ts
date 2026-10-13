import { DurableObject } from "cloudflare:workers";

// The worker has no public route: the site reaches it only through the LIVE binding in /api/live.

type Env = { LIVE: DurableObjectNamespace<Live> };

type Seat = {
  id: string;
  a: number;
  b: number;
  hue: number;
  ip: string;
  page: string;
  on: boolean;
  shown: boolean;
  last: number;
};

const MAX_ROOM = 300;
const MAX_PER_IP = 6;
const MIN_GAP_MS = 45;
const NAMES = 24;

const cleanPage = (v: unknown) =>
  typeof v === "string" ? v.replace(/[^\w/.-]/g, "").slice(0, 60) || "/" : "/";

const seatOf = (ws: WebSocket) => ws.deserializeAttachment() as Seat;

export class Live extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  fetch(request: Request) {
    if (request.headers.get("Upgrade") !== "websocket")
      return new Response("expected websocket", { status: 426 });
    const ip = request.headers.get("x-ip") ?? "";
    const all = this.ctx.getWebSockets();
    if (all.length >= MAX_ROOM || all.filter((w) => seatOf(w).ip === ip).length >= MAX_PER_IP)
      return new Response("busy", { status: 429 });

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    const rnd = crypto.getRandomValues(new Uint8Array(4));
    const seat: Seat = {
      id: [...rnd].map((x) => x.toString(16).padStart(2, "0")).join(""),
      a: rnd[0] % NAMES,
      b: rnd[1] % NAMES,
      hue: Math.round((rnd[2] / 255) * 360),
      ip,
      page: cleanPage(new URL(request.url).searchParams.get("page")),
      on: new URL(request.url).searchParams.get("cursors") !== "0",
      shown: false,
      last: 0,
    };
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(seat);
    server.send(JSON.stringify({ t: "hi", id: seat.id, a: seat.a, b: seat.b, hue: seat.hue }));
    this.count();
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== "string" || raw.length > 200) return;
    let msg: { t?: unknown; x?: unknown; y?: unknown; p?: unknown; on?: unknown };
    try {
      msg = JSON.parse(raw) as typeof msg;
    } catch {
      return;
    }
    const seat = seatOf(ws);

    if (msg.t === "c") {
      seat.on = msg.on === true;
      if (!seat.on && seat.shown) this.hide(ws, seat);
      ws.serializeAttachment(seat);
      return;
    }
    if (msg.t === "o") {
      if (seat.shown) this.hide(ws, seat);
      ws.serializeAttachment(seat);
      return;
    }
    if (msg.t !== "m" || !seat.on) return;

    const now = Date.now();
    const x = Number(msg.x);
    const y = Number(msg.y);
    if (now - seat.last < MIN_GAP_MS || !(x >= 0 && x <= 1) || !(y >= 0 && y <= 200_000)) return;
    const page = cleanPage(msg.p);
    if (page !== seat.page && seat.shown) this.hide(ws, seat);
    seat.page = page;
    seat.last = now;
    seat.shown = true;
    ws.serializeAttachment(seat);

    const out = JSON.stringify({
      t: "m",
      id: seat.id,
      a: seat.a,
      b: seat.b,
      hue: seat.hue,
      x: Math.round(x * 10000) / 10000,
      y: Math.round(y),
    });
    this.toPage(ws, page, out);
  }

  webSocketClose(ws: WebSocket) {
    this.leave(ws);
  }

  webSocketError(ws: WebSocket) {
    this.leave(ws);
  }

  private leave(ws: WebSocket) {
    const seat = seatOf(ws);
    if (seat?.shown) this.hide(ws, seat);
    try {
      ws.close(1000);
    } catch {
      // already closed
    }
    this.count(ws);
  }

  private hide(ws: WebSocket, seat: Seat) {
    seat.shown = false;
    this.toPage(ws, seat.page, JSON.stringify({ t: "o", id: seat.id }));
  }

  private toPage(from: WebSocket, page: string, data: string) {
    for (const w of this.ctx.getWebSockets()) {
      if (w === from) continue;
      const s = seatOf(w);
      if (s.on && s.page === page) send(w, data);
    }
  }

  private count(gone?: WebSocket) {
    const all = this.ctx.getWebSockets().filter((w) => w !== gone && w.readyState === WebSocket.OPEN);
    const data = JSON.stringify({ t: "n", n: all.length });
    for (const w of all) send(w, data);
  }
}

const send = (ws: WebSocket, data: string) => {
  try {
    ws.send(data);
  } catch {
    // the socket is closing, the close handler cleans up
  }
};

export default {
  fetch() {
    return new Response("not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
