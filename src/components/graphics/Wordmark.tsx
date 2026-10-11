import { site } from "../../config";

export const Wordmark = () => (
  <svg class="mark" viewBox="0 0 1000 175" aria-hidden="true">
    <defs>
      <pattern id="dots" width="9" height="9" patternUnits="userSpaceOnUse">
        <circle cx="2.6" cy="2.6" r="2.2" class="dt" />
        <animateTransform
          attributeName="patternTransform"
          type="translate"
          from="0 0"
          to="90 45"
          dur="18s"
          repeatCount="indefinite"
        />
      </pattern>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset=".42" stop-color="#fff" />
        <stop offset=".97" stop-color="#fff" stop-opacity="0" />
      </linearGradient>
      <mask id="fm">
        <rect width="1000" height="175" fill="url(#fade)" />
      </mask>
    </defs>
    <text
      x="0"
      y="128"
      textLength="1000"
      lengthAdjust="spacingAndGlyphs"
      fill="url(#dots)"
      mask="url(#fm)"
      font-family="var(--f-head)"
      font-weight="800"
      font-size="158"
    >
      {site.wordmark}
    </text>
  </svg>
);
