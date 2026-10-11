import { useEffect, useRef, useState } from "preact/hooks";

const SKIN = "color-mix(in srgb, var(--ink) 14%, var(--surf2))";
const EDGE = "color-mix(in srgb, var(--ink) 30%, transparent)";

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export const Defs = () => (
  <defs>
    <linearGradient id="u-scr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="var(--acc)" stop-opacity=".95" />
      <stop offset="1" stop-color="var(--acc2)" stop-opacity=".85" />
    </linearGradient>
    <linearGradient id="u-glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".28" />
      <stop offset=".45" stop-color="#fff" stop-opacity="0" />
    </linearGradient>
  </defs>
);

export function Laptop() {
  const lines = [60, 92, 40, 120, 76, 100, 54, 84];
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="MacBook" class="art">
      <rect x="52" y="14" width="216" height="140" rx="10" fill={SKIN} stroke={EDGE} />
      <rect x="60" y="22" width="200" height="124" rx="5" fill="#0d0e14" />
      <rect x="60" y="22" width="200" height="124" rx="5" fill="url(#u-scr)" opacity=".18" />
      <circle cx="160" cy="18" r="1.6" fill={EDGE} />
      <g class="code">
        {lines.map((w, i) => (
          <rect
            x={74 + (i % 3 === 1 ? 14 : i % 3 === 2 ? 28 : 0)}
            y={36 + i * 12}
            height="5"
            rx="2.5"
            width={w}
            fill={i % 2 ? "var(--acc2)" : "var(--acc)"}
            style={{ "--d": `${i * 0.35}s` }}
          />
        ))}
      </g>
      <rect x="60" y="22" width="200" height="124" rx="5" fill="url(#u-glass)" />
      <path d="M20 160h280l-14 20a8 8 0 0 1-7 4H41a8 8 0 0 1-7-4z" fill={SKIN} stroke={EDGE} />
      <rect x="132" y="160" width="56" height="5" rx="2.5" fill={EDGE} opacity=".6" />
    </svg>
  );
}

// The lock screen shows 20:17 on 20 July 1969: the Apollo 11 landing.
export function Phone() {
  return (
    <svg viewBox="0 0 140 240" role="img" aria-label="iPhone" class="art tall">
      <rect x="132" y="70" width="3" height="26" rx="1.5" fill={EDGE} />
      <rect x="5" y="62" width="3" height="14" rx="1.5" fill={EDGE} />
      <rect x="5" y="84" width="3" height="22" rx="1.5" fill={EDGE} />
      <rect x="10" y="4" width="120" height="232" rx="28" fill={SKIN} stroke={EDGE} stroke-width="1.5" />
      <rect x="17" y="11" width="106" height="218" rx="22" fill="url(#u-scr)" />
      <rect x="17" y="11" width="106" height="218" rx="22" fill="url(#u-glass)" />
      <rect x="54" y="18" width="32" height="10" rx="5" fill="#05060a" />
      <text x="70" y="76" text-anchor="middle" font-size="9.5" fill="#fff" opacity=".85">
        Sun, Jul 20
      </text>
      <text x="70" y="110" text-anchor="middle" font-size="36" font-weight="600" fill="#fff">
        20:17
      </text>
      <text x="70" y="126" text-anchor="middle" font-size="8" letter-spacing="2" fill="#fff" opacity=".6">
        1969
      </text>
      <g fill="#fff" opacity=".9">
        {[0, 1, 2, 3].map((i) => (
          <rect x={27 + i * 22} y="190" width="17" height="17" rx="5" opacity={0.35 + i * 0.12} />
        ))}
      </g>
      <rect x="52" y="219" width="36" height="3" rx="1.5" fill="#fff" opacity=".7" />
    </svg>
  );
}

export function Watch({ now }: { now: Date }) {
  const s = now.getSeconds();
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;
  return (
    <svg viewBox="0 0 160 200" role="img" aria-label="Apple Watch" class="art tall">
      <path d="M52 4h56l6 56H46zM46 140h68l-6 56H52z" fill={SKIN} stroke={EDGE} />
      <rect x="22" y="48" width="116" height="104" rx="30" fill={SKIN} stroke={EDGE} />
      <rect x="29" y="55" width="102" height="90" rx="25" fill="#0b0c12" />
      <g transform="translate(80 100)">
        {Array.from({ length: 12 }, (_, i) => (
          <line
            x1="0"
            y1="-36"
            x2="0"
            y2={i % 3 ? -33 : -30}
            stroke="#fff"
            stroke-width={i % 3 ? 1 : 2}
            opacity=".7"
            transform={`rotate(${i * 30})`}
          />
        ))}
        <line
          y2="-20"
          stroke="#fff"
          stroke-width="3"
          stroke-linecap="round"
          transform={`rotate(${h * 30})`}
        />
        <line
          y2="-31"
          stroke="#fff"
          stroke-width="2.2"
          stroke-linecap="round"
          transform={`rotate(${m * 6})`}
        />
        <line
          y1="6"
          y2="-33"
          stroke="var(--acc)"
          stroke-width="1.4"
          stroke-linecap="round"
          transform={`rotate(${s * 6})`}
          style={{ transition: s === 0 ? "none" : "transform .3s cubic-bezier(.4,2,.6,1)" }}
        />
        <circle r="2.6" fill="var(--acc)" />
      </g>
      <rect x="138" y="84" width="6" height="18" rx="3" fill={EDGE} />
    </svg>
  );
}

export function Pc() {
  const fan = (cx: number) => (
    <g transform={`translate(${cx} 138)`}>
      <circle r="21" fill="#0b0c12" stroke={EDGE} />
      <g class="fan">
        <circle r="16" fill="none" />
        {[0, 72, 144, 216, 288].map((a) => (
          <path
            d="M0 0C4-6 12-10 16-4C10-4 4-2 0 0z"
            fill="var(--acc)"
            opacity=".9"
            transform={`rotate(${a})`}
          />
        ))}
      </g>
      <circle r="4" fill={SKIN} />
    </g>
  );
  return (
    <svg viewBox="0 0 360 220" role="img" aria-label="PC" class="art wide">
      <rect x="20" y="8" width="320" height="204" rx="12" fill="#0d0e14" stroke={EDGE} />
      <rect x="20" y="8" width="320" height="204" rx="12" fill="url(#u-glass)" />
      {/* CPU + cooler */}
      <rect x="40" y="26" width="58" height="58" rx="8" fill={SKIN} stroke={EDGE} />
      <text x="69" y="60" text-anchor="middle" font-size="11" font-weight="700" fill="var(--acc)">
        i7
      </text>
      {/* RAM */}
      {[112, 128].map((x) => (
        <g>
          <rect x={x} y="22" width="10" height="66" rx="2" fill={SKIN} stroke={EDGE} />
          <rect x={x + 2} y="26" width="6" height="3" rx="1" class="led" fill="var(--acc2)" />
        </g>
      ))}
      {/* motherboard line art */}
      <path d="M150 54h60v20h44M254 74v18" stroke={EDGE} fill="none" stroke-dasharray="3 4" />
      {/* PSU */}
      <rect x="40" y="170" width="120" height="30" rx="5" fill={SKIN} stroke={EDGE} />
      <text x="100" y="190" text-anchor="middle" font-size="9" fill="var(--mut)">
        850W 80+ GOLD
      </text>
      {/* GPU */}
      <rect x="170" y="108" width="150" height="62" rx="9" fill={SKIN} stroke={EDGE} />
      {fan(205)}
      {fan(285)}
      {/* SSD */}
      <rect x="226" y="26" width="86" height="22" rx="4" fill={SKIN} stroke={EDGE} />
      <text x="269" y="41" text-anchor="middle" font-size="9" fill="var(--mut)">
        NVMe 1 TB
      </text>
    </svg>
  );
}

export function Monitor() {
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="Monitor" class="art">
      <rect x="30" y="12" width="260" height="154" rx="9" fill={SKIN} stroke={EDGE} />
      <rect x="37" y="19" width="246" height="136" rx="4" fill="#0d0e14" />
      <rect x="37" y="19" width="246" height="136" rx="4" fill="url(#u-scr)" opacity=".2" />
      <g class="sweep">
        <rect x="37" y="19" width="246" height="22" fill="var(--acc)" opacity=".16" />
        <rect x="37" y="40" width="246" height="1.5" fill="var(--acc)" />
      </g>
      <text x="160" y="96" text-anchor="middle" font-size="40" font-weight="700" fill="var(--ink)">
        75
      </text>
      <text x="160" y="118" text-anchor="middle" font-size="12" fill="var(--mut)" letter-spacing="3">
        HZ
      </text>
      <path d="M140 166h40l6 24h-52z" fill={SKIN} stroke={EDGE} />
      <rect x="110" y="188" width="100" height="6" rx="3" fill={SKIN} stroke={EDGE} />
    </svg>
  );
}

export function Mouse() {
  return (
    <svg viewBox="0 0 100 150" role="img" aria-label="Mouse" class="art tall">
      <path
        d="M50 6C74 6 88 28 88 60v38c0 28-16 46-38 46S12 126 12 98V60C12 28 26 6 50 6z"
        fill="#12131a"
        stroke={EDGE}
      />
      <path d="M50 6v52M12 62h76" stroke={EDGE} fill="none" />
      <rect x="45" y="22" width="10" height="22" rx="5" fill="var(--acc)" class="led" />
      <path
        d="M22 118c8 14 22 20 28 20s20-6 28-20"
        stroke="var(--acc2)"
        stroke-width="2"
        fill="none"
        class="led"
      />
    </svg>
  );
}

export function Mic() {
  return (
    <svg viewBox="0 0 100 190" role="img" aria-label="Fifine AM8" class="art tall">
      <defs>
        <pattern id="u-grid" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="1" fill="#ffffff" opacity=".28" />
        </pattern>
      </defs>
      <rect x="26" y="6" width="48" height="84" rx="24" fill="#12131a" stroke={EDGE} />
      <rect x="26" y="6" width="48" height="84" rx="24" fill="url(#u-grid)" />
      <rect x="26" y="52" width="48" height="6" fill="var(--acc)" opacity=".85" class="led" />
      <path d="M26 90h48l-6 40H32z" fill="#12131a" stroke={EDGE} />
      <circle cx="50" cy="104" r="3" fill="var(--acc)" class="led" />
      <path d="M50 130v34M30 176h40" stroke={EDGE} stroke-width="5" stroke-linecap="round" />
    </svg>
  );
}

export function Wave() {
  return (
    <div class="wave" aria-hidden="true">
      {Array.from({ length: 22 }, (_, i) => (
        <i style={{ "--i": i, "--h": 0.3 + Math.abs(Math.sin(i * 1.7)) * 0.7 }} />
      ))}
    </div>
  );
}

// An on-screen keyboard that lights up with real key presses (keyed by KeyboardEvent.code).
const ROWS: string[][] = [
  [
    "Escape",
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
    "Digit9",
    "Digit0",
    "Minus",
    "Equal",
    "Backspace",
  ],
  [
    "Tab",
    "KeyQ",
    "KeyW",
    "KeyE",
    "KeyR",
    "KeyT",
    "KeyY",
    "KeyU",
    "KeyI",
    "KeyO",
    "KeyP",
    "BracketLeft",
    "BracketRight",
    "Backslash",
  ],
  [
    "CapsLock",
    "KeyA",
    "KeyS",
    "KeyD",
    "KeyF",
    "KeyG",
    "KeyH",
    "KeyJ",
    "KeyK",
    "KeyL",
    "Semicolon",
    "Quote",
    "Enter",
  ],
  [
    "ShiftLeft",
    "KeyZ",
    "KeyX",
    "KeyC",
    "KeyV",
    "KeyB",
    "KeyN",
    "KeyM",
    "Comma",
    "Period",
    "Slash",
    "ShiftRight",
  ],
  ["ControlLeft", "AltLeft", "Space", "AltRight", "ControlRight"],
];
const WIDE: Record<string, number> = {
  Backspace: 2,
  Tab: 1.5,
  Backslash: 1.5,
  CapsLock: 1.8,
  Enter: 2.2,
  ShiftLeft: 2.3,
  ShiftRight: 2.7,
  ControlLeft: 1.4,
  AltLeft: 1.4,
  AltRight: 1.4,
  ControlRight: 1.4,
  Space: 6.2,
};
const LABEL: Record<string, string> = {
  Escape: "esc",
  Backspace: "⌫",
  Tab: "tab",
  CapsLock: "caps",
  Enter: "↵",
  ShiftLeft: "shift",
  ShiftRight: "shift",
  ControlLeft: "ctrl",
  ControlRight: "ctrl",
  AltLeft: "alt",
  AltRight: "alt",
  Space: "",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
};
const cap = (c: string) => LABEL[c] ?? c.replace(/^(Key|Digit)/, "").toLowerCase();

export function Keys({ onPress }: { onPress: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = (code: string) => box.current?.querySelector<HTMLElement>(`[data-k="${code}"]`);
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      el(e.code)?.classList.add("on");
      onPress();
    };
    const up = (e: KeyboardEvent) => el(e.code)?.classList.remove("on");
    const clear = () => box.current?.querySelectorAll(".on").forEach((k) => k.classList.remove("on"));
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    addEventListener("blur", clear);
    return () => {
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
      removeEventListener("blur", clear);
    };
  }, [onPress]);
  return (
    <div class="keys" ref={box} aria-hidden="true">
      {ROWS.map((row) => (
        <div class="kr">
          {row.map((c) => (
            <kbd data-k={c} style={{ flex: `${WIDE[c] ?? 1} 1 0` }}>
              {cap(c)}
            </kbd>
          ))}
        </div>
      ))}
    </div>
  );
}
