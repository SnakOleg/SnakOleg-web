// Small things a visitor can put next to their bed. Drawn at the bed's right edge, feet at 0,0.
export function Deco({ kind, letter = "" }: { kind: string; letter?: string }) {
  switch (kind) {
    case "sign":
      return (
        <g class="deco sign">
          <path d="M0 0V-30" class="wood" />
          <rect x="-14" y="-44" width="28" height="18" rx="3" class="board" />
          <text y="-31" text-anchor="middle">
            {letter.slice(0, 2)}
          </text>
        </g>
      );
    case "gnome":
      return (
        <g class="deco gnome">
          <path d="M-9 0h18l-3 -16h-12z" class="coat" />
          <circle cy="-20" r="6" class="skin" />
          <path d="M-7 -18q7 10 14 0z" class="beard" />
          <path d="M-8 -23l8 -18l8 18z" class="hat" />
        </g>
      );
    case "lantern":
      return (
        <g class="deco lantern">
          <path d="M0 0V-34" class="wood" />
          <rect x="-7" y="-48" width="14" height="16" rx="3" class="lamp" />
          <circle cy="-40" r="12" class="halo" />
        </g>
      );
    case "pinwheel":
      return (
        <g class="deco pinwheel">
          <path d="M0 0V-34" class="wood" />
          <g transform="translate(0 -38)">
            <g class="spin">
              <path d="M0 0l-10 -10h10z" class="p1" />
              <path d="M0 0l10 -10v10z" class="p2" />
              <path d="M0 0l10 10h-10z" class="p1" />
              <path d="M0 0l-10 10v-10z" class="p2" />
            </g>
          </g>
        </g>
      );
    case "birdhouse":
      return (
        <g class="deco birdhouse">
          <path d="M0 0V-30" class="wood" />
          <rect x="-10" y="-50" width="20" height="20" class="box" />
          <path d="M-13 -50l13 -12l13 12z" class="roof" />
          <circle cy="-40" r="3.4" class="hole" />
        </g>
      );
    case "fence":
      return (
        <g class="deco minifence">
          {[-16, -6, 4, 14].map((x) => (
            <path key={x} d={`M${x} 0v-16l3 -4l3 4v16z`} />
          ))}
          <path d="M-18 -10h38" class="rail" />
        </g>
      );
    default:
      return null;
  }
}
