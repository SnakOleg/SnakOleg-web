import type { ComponentChildren } from "preact";

const t = (x: number, y: number, size: number, s: string) => (
  <text x={x} y={y} font-size={size} class="ic-t">
    {s}
  </text>
);

// Drawn on a 48 by 48 grid with one stroke width, so every stamp reads as the same hand.
export const ICONS: Record<string, ComponentChildren> = {
  terminal: (
    <>
      <rect x="5" y="9" width="38" height="30" rx="4" />
      <path d="M13 19l6 5-6 5M24 30h10" />
    </>
  ),
  lock: (
    <>
      <rect x="10" y="21" width="28" height="19" rx="4" />
      <path d="M16 21v-5a8 8 0 0 1 16 0v5M24 29v4" />
    </>
  ),
  sandwich: (
    <>
      <path d="M7 18a17 9 0 0 1 34 0z" />
      <path d="M6 25q4 4 9 0t9 0t9 0t9 0" />
      <path d="M8 30h32M8 36h32q0 6-7 6H15q-7 0-7-6z" />
    </>
  ),
  skull: (
    <>
      <path d="M10 23a14 14 0 1 1 28 0c0 5-2 8-5 9v6H15v-6c-3-1-5-4-5-9z" />
      <circle cx="18" cy="24" r="3" />
      <circle cx="30" cy="24" r="3" />
      <path d="M21 38v-5M27 38v-5M24 29l-1.5 3h3z" />
    </>
  ),
  matrix: (
    <>
      <path d="M10 6v8M10 19v13M10 36v6M19 10v5M19 20v10M19 35v7M28 6v12M28 23v6M28 34v8M37 8v7M37 20v15M37 39v3" />
    </>
  ),
  file: (
    <>
      <path d="M12 5h17l8 8v30H12z" stroke-dasharray="4 3" />
      <path d="M29 5v8h8" />
      <circle cx="24" cy="31" r="2.2" class="fl" />
    </>
  ),
  teapot: (
    <>
      <path d="M11 21h24v9a8 8 0 0 1-8 8h-8a8 8 0 0 1-8-8z" />
      <path d="M19 21v-3h8v3M35 24h5l-3 7M11 24H8a3.5 3.5 0 0 0 0 7h3M19 13q-2-3 0-6M26 13q-2-3 0-6" />
    </>
  ),
  mask: (
    <>
      <path d="M24 5c-9 0-14 7-14 15 0 9 5 17 14 22 9-5 14-13 14-22 0-8-5-15-14-15z" />
      <path d="M15 19q3-3 7 0M26 19q3-3 7 0M15 29q9-5 18 0M24 33v5" />
    </>
  ),
  vim: (
    <>
      <path d="M24 5l17 19-17 19L7 24z" />
      <path d="M16 18l8 16 8-16" />
    </>
  ),
  cube: (
    <>
      <path d="M24 5l16 9v20l-16 9-16-9V14z" />
      <path d="M8 14l16 9 16-9M24 23v20" />
    </>
  ),
  cow: (
    <>
      <path d="M11 15h26v19a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5z" />
      <path d="M11 15l-5-7M37 15l5-7" />
      <ellipse cx="24" cy="31" rx="8" ry="5.5" />
      <path d="M20 31h.1M28 31h.1M17 22h.1M31 22h.1" stroke-width="4.5" />
    </>
  ),
  answer: (
    <>
      <circle cx="24" cy="24" r="18" />
      {t(24, 25, 17, "42")}
    </>
  ),
  cookie: (
    <>
      <path d="M6 28q18-22 36 0-18 10-36 0z" />
      <path d="M24 17q-6 8 0 20" />
      <path d="M33 33l9 6" />
    </>
  ),
  dpad: (
    <>
      <path d="M18 6h12v12h12v12H30v12H18V30H6V18h12z" />
      <path d="M24 12l-3 4h6z" class="fl" />
    </>
  ),
  cat: (
    <>
      <path d="M8 22V7l10 6h12l10-6v15c0 9-7 16-16 16S8 31 8 22z" />
      <path d="M17 23h.1M31 23h.1" stroke-width="4.5" />
      <path d="M22 29h4l-2 2.2zM4 27l9 1.5M4 33l9-1.5M44 27l-9 1.5M44 33l-9-1.5" />
    </>
  ),
  badge: (
    <>
      <rect x="7" y="12" width="34" height="28" rx="4" />
      <path d="M19 8h10M13 25h22M13 32h14" />
    </>
  ),
  crt: (
    <>
      <rect x="5" y="8" width="38" height="27" rx="5" />
      <rect x="10" y="13" width="28" height="17" rx="2" />
      <path d="M17 41h14M24 35v6" />
    </>
  ),
  moon: (
    <>
      <path d="M31 6a18 18 0 1 0 11 27A15 15 0 0 1 31 6z" />
      <path d="M34 28l1.5 3.5L39 33l-3.5 1.5L34 38l-1.5-3.5L29 33l3.5-1.5z" class="fl" />
    </>
  ),
  code: (
    <>
      <path d="M17 13L6 24l11 11M31 13l11 11-11 11M27 8l-6 32" />
    </>
  ),
  umbrella: (
    <>
      <path d="M5 25C5 14 13 7 24 7s19 7 19 18c-4-4-9-4-13 0-4-4-9-4-13 0-4-4-9-4-13 0z" />
      <path d="M24 7V4M24 25v13a4.5 4.5 0 0 1-9 0M10 34l-2 5M39 34l-2 5M31 38l-2 5" />
    </>
  ),
  book: (
    <>
      <path d="M5 12q9-3 19 2 10-5 19-2v26q-9-3-19 2-10-5-19-2z" />
      <path d="M24 14v26M11 19q5-1 8 1M11 25q5-1 8 1M29 20q3-2 8-1M29 26q3-2 8-1" />
    </>
  ),
  compass: (
    <>
      <circle cx="24" cy="24" r="18" />
      <path d="M31 17l-4 10-10 4 4-10z" />
      <path d="M24 3v4M24 41v4M3 24h4M41 24h4" />
    </>
  ),
  back: (
    <>
      <path d="M14 19h20a8 8 0 0 1 0 16H17" />
      <path d="M20 11l-8 8 8 8" />
    </>
  ),
  page: (
    <>
      <path d="M11 5h18l8 8v7l-4 3.5 4 3.5v14H11z" />
      <path d="M29 5v8h8" />
      {t(23, 32, 12, "404")}
    </>
  ),
  palette: (
    <>
      <path d="M24 5C13 5 5 13 5 24s8 19 17 19c3 0 4-2 3-4.5s0-4.5 3-4.5h5c6 0 10-4 10-9C43 13 35 5 24 5z" />
      <path d="M14 22h.1M19 13h.1M30 13h.1M36 21h.1" stroke-width="4.5" />
    </>
  ),
  key: (
    <>
      <rect x="7" y="7" width="34" height="30" rx="6" />
      <path d="M7 41h34" />
      {t(24, 23, 18, "T")}
    </>
  ),
  cloud: (
    <>
      <path d="M13 38a8.5 8.5 0 0 1 0-17 12 12 0 0 1 23 3 7 7 0 0 1-1 14z" />
      <path d="M34 8v3M42 14l-2 2M28 14l2 2" />
    </>
  ),
  sun: (
    <>
      <circle cx="24" cy="24" r="8" />
      <path d="M24 5v6M24 37v6M5 24h6M37 24h6M10.6 10.6l4.2 4.2M33.2 33.2l4.2 4.2M37.4 10.6l-4.2 4.2M14.8 33.2l-4.2 4.2" />
    </>
  ),
  star: <path d="M24 5l5.5 12 13 1.4-9.7 8.8 2.8 12.9L24 33l-11.6 7.1 2.8-12.9-9.7-8.8 13-1.4z" />,
  coffee: (
    <>
      <path d="M8 18h26v12a9 9 0 0 1-9 9h-8a9 9 0 0 1-9-9z" />
      <path d="M34 22h2.5a4.5 4.5 0 0 1 0 9H33M16 6q-3 3 0 6M24 6q-3 3 0 6" />
    </>
  ),
  plane: <path d="M42 8L6 22l12 5 4 12 5-8 9 6z M18 27l24-19" />,
  chat: (
    <>
      <path d="M6 9h36v24H27l-9 8v-8H6z" />
      <path d="M15 21h.1M24 21h.1M33 21h.1" stroke-width="4.5" />
    </>
  ),
  mail: (
    <>
      <rect x="5" y="10" width="38" height="28" rx="3" />
      <path d="M5 13l19 14 19-14" />
    </>
  ),
  capsule: (
    <>
      <rect x="14" y="4" width="20" height="40" rx="10" />
      <path d="M14 24h20" />
      <circle cx="24" cy="15" r="3" />
      <path d="M20 33h8" />
    </>
  ),
  flower: (
    <>
      <circle cx="24" cy="14" r="4" />
      <circle cx="16.5" cy="19" r="4" />
      <circle cx="31.5" cy="19" r="4" />
      <circle cx="19.5" cy="27" r="4" />
      <circle cx="28.5" cy="27" r="4" />
      <path d="M24 31v13M24 40q-8 0-10-8 9 0 10 8z" />
    </>
  ),
  tiles: (
    <>
      <rect x="4" y="15" width="11" height="11" rx="2" />
      <rect x="18" y="15" width="11" height="11" rx="2" class="fl" />
      <rect x="32" y="15" width="11" height="11" rx="2" />
      <path d="M4 33h39M4 38h25" />
    </>
  ),
  flame: (
    <>
      <path d="M24 4c2 9 11 13 11 24a11 11 0 0 1-22 0c0-5 3-8 5-11 1 4 3 5 5 5 0-5-2-10 1-18z" />
      {t(24, 32, 14, "7")}
    </>
  ),
  bolt: <path d="M28 4L10 27h12l-3 17 19-25H26z" />,
  tree: (
    <>
      <path d="M24 5l10 14h-6l9 12H11l9-12h-6z" />
      <path d="M24 31v10" />
    </>
  ),
  pumpkin: (
    <>
      <path d="M24 13c-12 0-19 6-19 15s7 13 19 13 19-4 19-13-7-15-19-15z" />
      <path d="M24 13c-6 6-6 22 0 28M24 13c6 6 6 22 0 28M24 13V7l4-2" />
    </>
  ),
  heart: <path d="M24 42C6 29 6 14 17 11c5-1 7 2 7 5 0-3 2-6 7-5 11 3 11 18-7 31z" />,
};

export const hasIcon = (name: string) => name in ICONS;
