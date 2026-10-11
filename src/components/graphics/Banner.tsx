export const Banner = ({ h, g, img }: { h: number; g: string; img?: string }) =>
  img ? (
    <img class="bn" src={img} alt="" loading="lazy" decoding="async" width="500" height="200" />
  ) : (
    <svg class="bn" viewBox="0 0 500 200" aria-hidden="true">
      <defs>
        <linearGradient id={"g" + h} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color={`hsl(${h},38%,30%)`} />
          <stop offset="1" stop-color={`hsl(${h + 50},42%,15%)`} />
        </linearGradient>
        <pattern id={"p" + h} width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="#fff" opacity=".13" />
        </pattern>
      </defs>
      <rect width="500" height="200" fill={`url(#g${h})`} />
      <rect width="500" height="200" fill={`url(#p${h})`} />
      <circle cx="420" cy="30" r="90" fill={`hsl(${h},60%,62%)`} opacity=".18" />
      <text
        x="250"
        y="124"
        text-anchor="middle"
        font-size="84"
        font-weight="800"
        fill="#fff"
        fill-opacity=".92"
        font-family="var(--f-head)"
      >
        {g}
      </text>
    </svg>
  );
