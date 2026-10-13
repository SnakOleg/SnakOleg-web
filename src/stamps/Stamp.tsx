import type { ComponentChildren } from "preact";
import { ICONS } from "./icons";
import type { Look } from "./look";

const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
const safe = (s: string) => s.replace(/[^a-z0-9]/gi, "-");

// One shared filter gives every stamp the rough edge and the worn spots of real ink.
export function InkDefs() {
  return (
    <svg class="inkdefs" width="0" height="0" aria-hidden="true" focusable="false">
      <filter id="snak-ink" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="rough" />
        <feDisplacementMap in="SourceGraphic" in2="rough" scale="1.7" result="wobble" />
        <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" seed="11" result="worn" />
        <feColorMatrix
          in="worn"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  16 0 0 0 -3.6"
          result="spots"
        />
        <feComposite in="wobble" in2="spots" operator="in" />
      </filter>
    </svg>
  );
}

const STAR_POINTS = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2;
  const r = i % 2 ? 40 : 46;
  return `${(50 + Math.sin(a) * r).toFixed(1)},${(50 - Math.cos(a) * r).toFixed(1)}`;
}).join(" ");

const HEX = "50,5 90,27 90,73 50,95 10,73 10,27";
const HEX_IN = "50,13 83,31 83,69 50,87 17,69 17,31";

type Draw = (look: Look, id: string, ink: ComponentChildren) => ComponentChildren;

const place = (look: Look, x: number, y: number, scale: number) => {
  const art = ICONS[look.icon];
  return (
    <g class="art" transform={`translate(${x - 24 * scale} ${y - 24 * scale}) scale(${scale})`}>
      {art ?? (
        <text x="24" y="25" font-size="19" class="ic-t">
          {look.icon}
        </text>
      )}
    </g>
  );
};

const label = (s: string, y: number, size: number, max: number) => (
  <text
    x="50"
    y={y}
    font-size={size}
    class="lb"
    textLength={Math.min(max, s.length * size * 0.72)}
    lengthAdjust="spacingAndGlyphs"
  >
    {s}
  </text>
);

const FRAMES: Record<Look["frame"], Draw> = {
  postage: (look) => (
    <>
      <rect x="8" y="5" width="84" height="90" rx="2" class="perf" />
      <rect x="17" y="14" width="66" height="72" class="thin" />
      {place(look, 50, 46, 1.15)}
      {label("SNAK", 80, 9, 40)}
    </>
  ),
  seal: (look, id) => {
    const ring = `${look.title.toUpperCase()} · `.repeat(2);
    return (
      <>
        <circle cx="50" cy="50" r="45" />
        <circle cx="50" cy="50" r="26" class="thin" />
        <path id={`r-${safe(id)}`} d="M50 50m-36 0a36 36 0 1 1 72 0a36 36 0 1 1-72 0" class="none" />
        <text class="ring" font-size="8.5">
          <textPath href={`#r-${safe(id)}`} textLength="224" lengthAdjust="spacingAndGlyphs">
            {ring}
          </textPath>
        </text>
        {place(look, 50, 50, 0.7)}
      </>
    );
  },
  ticket: (look) => (
    <>
      <path d="M10 18H90A4 4 0 0 1 94 22V44A6 6 0 0 0 94 56V78A4 4 0 0 1 90 82H10A4 4 0 0 1 6 78V56A6 6 0 0 0 6 44V22A4 4 0 0 1 10 18Z" />
      <path d="M13 66H87" class="thin dash" />
      {place(look, 50, 41, 0.78)}
      {label(look.title.toUpperCase(), 75, 8.5, 70)}
    </>
  ),
  customs: (look) => (
    <>
      <rect x="6" y="14" width="88" height="72" rx="3" />
      <rect x="11" y="19" width="78" height="62" rx="1.5" class="thin" />
      {place(look, 50, 40, 0.8)}
      <path d="M11 60H89" class="thin" />
      {label(look.title.toUpperCase(), 72, 9, 70)}
    </>
  ),
  postmark: (look, id) => (
    <>
      <circle cx="37" cy="50" r="31" />
      <circle cx="37" cy="50" r="19" class="thin" />
      <path id={`r-${safe(id)}`} d="M37 50m-25 0a25 25 0 1 1 50 0a25 25 0 1 1-50 0" class="none" />
      <text class="ring" font-size="6.6">
        <textPath href={`#r-${safe(id)}`} textLength="152" lengthAdjust="spacingAndGlyphs">
          {`${look.title.toUpperCase()} · `.repeat(2)}
        </textPath>
      </text>
      {place(look, 37, 50, 0.6)}
      <path
        d="M72 36q4-4 8 0t8 0t8 0M72 46q4-4 8 0t8 0t8 0M72 56q4-4 8 0t8 0t8 0M72 66q4-4 8 0t8 0t8 0"
        class="wave"
      />
    </>
  ),
  shield: (look) => (
    <>
      <path d="M50 5L88 17V46C88 68 71 85 50 95C29 85 12 68 12 46V17Z" />
      <path d="M50 13L81 22V46C81 63 67 78 50 87C33 78 19 63 19 46V22Z" class="thin" />
      {place(look, 50, 47, 0.9)}
    </>
  ),
  rosette: (look) => (
    <>
      <polygon points={STAR_POINTS} />
      <circle cx="50" cy="50" r="33" class="thin dash" />
      {place(look, 50, 50, 1)}
    </>
  ),
  hex: (look) => (
    <>
      <polygon points={HEX} />
      <polygon points={HEX_IN} class="thin" />
      {place(look, 50, 50, 0.95)}
    </>
  ),
};

export function Stamp({ look, id, locked = false }: { look: Look; id: string; locked?: boolean }) {
  const tilt = (hash(id) % 15) - 7;
  const draw = FRAMES[look.frame];
  if (locked)
    return (
      <svg class="stamp locked" viewBox="0 0 100 100" role="img" aria-label="?" style={{ "--sh": look.hue }}>
        <g class="ink">{draw({ ...look, icon: "?", title: "???" }, id, null)}</g>
      </svg>
    );
  return (
    <svg
      class="stamp"
      viewBox="0 0 100 100"
      role="img"
      aria-label={look.title}
      style={{ "--sh": look.hue, rotate: `${tilt}deg` }}
    >
      <g class="ghost" filter="url(#snak-ink)">
        {draw(look, `${id}-g`, null)}
      </g>
      <g class="ink" filter="url(#snak-ink)">
        {draw(look, id, null)}
      </g>
    </svg>
  );
}
