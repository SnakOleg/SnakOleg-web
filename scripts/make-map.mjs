// Builds src/assets/map/world.json (one SVG path per country). Run it rarely:
//   npm i --no-save world-atlas topojson-client d3-geo i18n-iso-countries && node scripts/make-map.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import countries from "i18n-iso-countries";
import { feature } from "topojson-client";

const topo = JSON.parse(readFileSync("node_modules/world-atlas/countries-110m.json", "utf8"));
const world = feature(topo, topo.objects.countries);

const W = 1000;
const projection = geoNaturalEarth1().fitWidth(W, { type: "Sphere" });
const path = geoPath(projection).digits(1);
const [[, y0], [, y1]] = geoPath(projection).bounds({ type: "Sphere" });

const out = {};
for (const f of world.features) {
  const code = countries.numericToAlpha2(String(f.id).padStart(3, "0"));
  const d = path(f);
  if (code && d) out[code] = d;
}
writeFileSync(
  "src/assets/map/world.json",
  JSON.stringify({ w: W, h: Math.ceil(y1 - y0), top: Math.floor(y0), c: out }),
);
console.log(Object.keys(out).length, "countries");
