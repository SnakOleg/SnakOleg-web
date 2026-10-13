import type { Loc } from "../../../shared/garden";
import {
  Arch,
  Bench,
  Bush,
  Cottage,
  Fence,
  Fruit,
  Hills,
  Lamp,
  Meadow,
  Pines,
  Rocks,
  Tree,
  Tufts,
  Wild,
  Windmill,
} from "./common";
import type { Look, SceneDef } from "./world";

const lit = (p: Look) => p.tone !== "day";

function Pond({ x, y, rx = 116, ry = 20 }: { x: number; y: number; rx?: number; ry?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} class="pond">
      <ellipse rx={rx + 12} ry={ry + 6} class="bank" />
      <ellipse rx={rx} ry={ry} class="water" />
      <ellipse rx={rx * 0.7} ry={ry * 0.6} class="shine" />
      <ellipse rx="24" ry="5" class="ripple" />
      <ellipse rx="24" ry="5" class="ripple" style={{ animationDelay: "2.2s" }} />
      {[-0.45, 0.3, 0.6].map((k, i) => (
        <g key={i} class="pad" transform={`translate(${rx * k} ${(i - 1) * ry * 0.3})`}>
          <ellipse rx={14 - i * 2} ry={5 - i * 0.6} />
          {i !== 1 && <circle cy="-3" r="3" class="lotus" />}
        </g>
      ))}
      <g class="duck">
        <ellipse cx="0" cy="-2" rx="11" ry="6" class="body" />
        <circle cx="-8" cy="-9" r="4.6" class="body" />
        <path d="M-12 -9l-6 2l6 2z" class="beak" />
        <circle cx="-9" cy="-10" r="1" class="pupil" />
      </g>
      {[-rx + 4, -rx + 16, rx - 8, rx + 2].map((cx, i) => (
        <g key={i} class="reed" transform={`translate(${cx} ${i % 2 ? 6 : 2})`}>
          <path d="M0 0v-30" />
          <rect x="-2.6" y="-38" width="5.2" height="12" rx="2.6" />
        </g>
      ))}
    </g>
  );
}

const meadow: SceneDef = {
  id: "meadow",
  rows: [
    { y: 478, s: 0.6, n: 24, x0: 70, x1: 1130 },
    { y: 556, s: 0.82, n: 18, x0: 90, x1: 1110 },
    { y: 648, s: 1.12, n: 12, x0: 130, x1: 1070 },
    { y: 752, s: 1.5, n: 6, x0: 200, x1: 1000 },
  ],
  lanes: [
    { y: 420, s: 0.55, x0: 40, x1: 1160 },
    { y: 600, s: 0.95, x0: 80, x1: 1120 },
  ],
  Back: () => (
    <>
      <Hills top={340} />
      <Pines y={330} />
      <Windmill x={900} y={306} />
      <Cottage x={330} y={336} />
      <Meadow top={340} />
      <Pond x={150} y={366} />
      <Tree x={1080} y={392} swing />
      <Fence y={394} gap={[548, 652]} />
      <Arch x={600} y={394} />
      <Tufts top={340} />
      <Wild top={340} />
      <Rocks
        list={[
          [60, 512, 16],
          [1140, 468, 14],
          [610, 770, 18],
          [330, 438, 11],
          [980, 590, 12],
        ]}
      />
    </>
  ),
  Front: (p) => (
    <>
      <g transform="translate(50 640)" class="bath">
        <path d="M-6 0h12l4 -30h-20z" class="stone" />
        <ellipse cy="-32" rx="22" ry="7" class="stone" />
        <ellipse cy="-33" rx="17" ry="4.5" class="basin" />
      </g>
      <Scarecrow x={1136} y={600} />
      <Barrow x={1110} y={748} />
      <Bench x={112} y={760} cat />
      <Lamp x={34} y={540} lit={lit(p)} />
      <Lamp x={1166} y={700} lit={lit(p)} />
      <Bush x={18} y={782} />
      <Bush x={1184} y={780} flip />
    </>
  ),
};

const pond: SceneDef = {
  id: "pond",
  rows: [
    { y: 404, s: 0.55, n: 18, x0: 80, x1: 1120 },
    { y: 650, s: 1.05, n: 11, x0: 120, x1: 1080 },
    { y: 756, s: 1.45, n: 6, x0: 210, x1: 990 },
  ],
  lanes: [
    { y: 440, s: 0.6, x0: 60, x1: 1140 },
    { y: 596, s: 0.9, x0: 60, x1: 1140 },
  ],
  Back: () => (
    <>
      <Hills top={330} seed={2} />
      <Pines y={322} n={36} h={30} seed={7} />
      <Meadow top={330} />
      <Tufts top={330} n={60} seed={4} />
      <g class="lake">
        <path d="M40 520Q120 455 380 462T860 458T1170 520Q1120 585 820 580T300 584T40 520z" class="bankl" />
        <path d="M70 520Q150 470 390 476T850 472T1140 520Q1090 570 820 566T310 570T70 520z" class="water" />
        <path d="M200 500Q500 486 860 498" class="shine" />
        <path d="M300 540Q600 528 980 540" class="shine" />
        {[220, 540, 900].map((x, i) => (
          <ellipse
            key={x}
            cx={x}
            cy={514 + i * 6}
            rx="26"
            ry="6"
            class="ripple"
            style={{ animationDelay: `${i * 1.3}s` }}
          />
        ))}
      </g>
      <g class="pier">
        <path d="M760 470h120v12h-120z" class="plank" />
        {[770, 800, 830, 860].map((x) => (
          <path key={x} d={`M${x} 482v26`} class="post" />
        ))}
      </g>
      <g transform="translate(470 512)">
        <g class="boat">
          <path d="M-46 0h92l-14 16h-64z" class="hull" />
          <path d="M-30 0v-4h60v4" class="rim" />
          <g class="fisher" transform="translate(4 -6)">
            <circle cx="0" cy="-26" r="7" class="skin" />
            <path d="M-8 -30h16l-2 -6h-12z" class="hat" />
            <rect x="-8" y="-19" width="16" height="19" rx="5" class="coat" />
            <path d="M6 -14L46 -46" class="rod" />
            <path d="M46 -46Q52 -20 50 6" class="line" />
          </g>
        </g>
      </g>
      <Pond x={1040} y={392} rx={60} ry={10} />
      {[120, 156, 1100].map((x, i) => (
        <g key={x} class="reed" transform={`translate(${x} ${505 + i * 4})`}>
          <path d="M0 0v-36" />
          <rect x="-2.6" y="-44" width="5.2" height="12" rx="2.6" />
        </g>
      ))}
      <g class="frog">
        <ellipse cx="0" cy="0" rx="8" ry="5" />
        <circle cx="-4" cy="-5" r="2.6" />
        <circle cx="4" cy="-5" r="2.6" />
      </g>
      <Tree x={70} y={400} s={0.8} />
      <Wild top={560} n={24} seed={30} />
    </>
  ),
  Front: (p) => (
    <>
      <Lamp x={40} y={610} lit={lit(p)} />
      <Lamp x={1160} y={610} lit={lit(p)} />
      <Bush x={20} y={784} />
      <Bush x={1180} y={784} flip />
      <Rocks
        list={[
          [1130, 760, 18],
          [96, 730, 14],
        ]}
      />
    </>
  ),
};

const orchard: SceneDef = {
  id: "orchard",
  rows: [
    { y: 468, s: 0.6, n: 18, x0: 120, x1: 1080 },
    { y: 562, s: 0.85, n: 14, x0: 120, x1: 1080 },
    { y: 662, s: 1.15, n: 10, x0: 140, x1: 1060 },
    { y: 760, s: 1.5, n: 6, x0: 210, x1: 990 },
  ],
  lanes: [
    { y: 512, s: 0.7, x0: 60, x1: 1140 },
    { y: 612, s: 1, x0: 60, x1: 1140 },
  ],
  Back: (p) => (
    <>
      <Hills top={350} seed={4} />
      <Meadow top={350} />
      <g class="barn" transform="translate(170 400)">
        <path d="M-70 0V-70L0 -116L70 -70V0z" class="wall" />
        <path d="M-80 -66L0 -124L80 -66" class="roof" />
        <rect x="-26" y="-56" width="52" height="56" class="door" />
        <path d="M-26 -56L26 0M26 -56L-26 0" class="cross" />
        <circle cy="-86" r="10" class="hay" />
      </g>
      <g class="glasshouse" transform="translate(980 404)">
        <path d="M-90 0V-60Q0 -120 90 -60V0z" class="glass" />
        <path d="M-30 0V-92M30 0V-92M-90 -60Q0 -120 90 -60M0 0V-102" class="frame" />
        {lit(p) && <ellipse cx="0" cy="-40" rx="70" ry="30" class="warm" />}
      </g>
      {[360, 470, 580, 690, 800].map((x, i) => (
        <Fruit key={x} x={x} y={398} s={0.8} seed={i * 7} />
      ))}
      <Fence y={420} gap={[560, 640]} />
      <g class="well" transform="translate(1110 470)">
        <ellipse cy="0" rx="26" ry="8" class="stone" />
        <path d="M-26 0v-24h52v24" class="stone" />
        <path d="M-22 -24v-40M22 -24v-40M-30 -64h60l-30 -18z" class="wood" />
      </g>
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M${110 + i * 4} ${470 + i * 98}H${1090 - i * 4}`}
          class="furrow"
          style={{ strokeWidth: `${18 + i * 8}px` }}
        />
      ))}
      <Tufts top={350} n={50} seed={9} />
      <g class="hens">
        {[
          [250, 452],
          [292, 460],
          [860, 446],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${i === 2 ? -1 : 1} 1)`} class="hen">
            <g style={{ animationDelay: `${i * 0.7}s` }}>
              <ellipse cx="0" cy="-10" rx="14" ry="10" class="body" />
              <circle cx="-12" cy="-20" r="6" class="body" />
              <path d="M-14 -27l2 -5l3 5z" class="comb" />
              <path d="M-18 -20l-5 2l5 2z" class="beak" />
              <path d="M-2 0v6M4 0v6" class="legs" />
            </g>
          </g>
        ))}
      </g>
    </>
  ),
  Front: (p) => (
    <>
      <Scarecrow x={60} y={760} />
      <Barrow x={1120} y={770} />
      <Lamp x={1170} y={560} lit={lit(p)} />
    </>
  ),
};

const forest: SceneDef = {
  id: "forest",
  rows: [
    { y: 486, s: 0.62, n: 16, x0: 160, x1: 1040 },
    { y: 590, s: 0.9, n: 12, x0: 150, x1: 1050 },
    { y: 712, s: 1.3, n: 7, x0: 190, x1: 1010 },
  ],
  lanes: [{ y: 536, s: 0.8, x0: 60, x1: 1140 }],
  Back: (p) => (
    <>
      <Hills top={360} seed={6} />
      <Pines y={360} n={30} h={60} seed={13} />
      <Pines y={410} n={22} h={80} seed={21} />
      <Meadow top={410} />
      {[40, 120, 1080, 1160].map((x, i) => (
        <g key={x} class="birch" transform={`translate(${x} ${470 + (i % 2) * 20})`}>
          <path d="M-6 0V-170h12V0z" class="bark" />
          {[30, 70, 110, 150].map((y) => (
            <path key={y} d={`M-6 -${y}h6`} class="mark" />
          ))}
          <circle cy="-180" r="40" class="crown light" />
          <circle cx="-22" cy="-150" r="26" class="crown" />
          <circle cx="24" cy="-152" r="26" class="crown" />
        </g>
      ))}
      <g class="tent" transform="translate(930 470)">
        <path d="M-60 0L0 -70L60 0z" class="cloth" />
        <path d="M0 -70L0 0M-14 0L0 -36L14 0" class="door" />
      </g>
      <g class="camp" transform="translate(760 500)">
        <ellipse rx="30" ry="8" class="ring" />
        <path d="M-20 4l40 -10M-20 -6l40 10" class="log" />
        {lit(p) ? (
          <g class="fire">
            <path d="M-10 -2q4 -26 10 -34q6 10 10 34z" />
            <path d="M-5 -2q2 -14 5 -20q3 6 5 20z" class="core" />
          </g>
        ) : (
          <path d="M-4 -4q-4 -10 2 -18q-2 8 4 12" class="smoke2" />
        )}
      </g>
      <Wild top={420} n={30} seed={50} />
      <Tufts top={410} n={70} seed={60} />
      <g class="shrooms">
        {Array.from({ length: 7 }, (_, i) => {
          const a = (i / 7) * Math.PI * 2;
          return (
            <g key={i} transform={`translate(${300 + Math.cos(a) * 46} ${640 + Math.sin(a) * 14})`}>
              <rect x="-2" y="-8" width="4" height="8" class="stem" />
              <path d="M-7 -8a7 6 0 0 1 14 0z" class="cap" />
            </g>
          );
        })}
      </g>
    </>
  ),
  Front: (p) => (
    <>
      <g class="log2" transform="translate(110 760)">
        <rect x="-70" y="-22" width="140" height="22" rx="11" />
        <ellipse cx="70" cy="-11" rx="8" ry="11" class="cut" />
      </g>
      <Rocks
        list={[
          [1120, 770, 22],
          [1070, 780, 12],
        ]}
      />
      {p.tone === "night" && (
        <g class="owl" transform="translate(1160 300)">
          <ellipse rx="12" ry="16" />
          <circle cx="-5" cy="-6" r="4" class="eyew" />
          <circle cx="5" cy="-6" r="4" class="eyew" />
        </g>
      )}
    </>
  ),
};

function Scarecrow({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} class="scare">
      <path d="M0 0V-72M-28 -52h56" class="pole" />
      <circle cy="-82" r="11" class="sack" />
      <path d="M-18 -92h36l-6 -10h-24z" class="hat" />
      <path d="M-4 -84h.1M4 -84h.1" class="stitch" />
      <path d="M-12 -50l-6 14M12 -50l6 14" class="stitch" />
      <path d="M-10 -66h20v22h-20z" class="shirt" />
    </g>
  );
}

function Barrow({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} class="barrow">
      <path d="M-34 -24h60l-12 24h-38z" class="tub" />
      <path d="M26 -24l28 -8" class="pole" />
      <circle cx="-4" cy="2" r="9" class="wheel" />
      <circle cx="-22" cy="-30" r="6" fill="#f28bb0" />
      <circle cx="-8" cy="-34" r="6" fill="#f7d44c" />
      <circle cx="8" cy="-31" r="6" fill="#ff8a5b" />
      <circle cx="-14" cy="-26" r="5" fill="#fff" />
    </g>
  );
}

export const SCENES: Record<Loc, SceneDef> = { meadow, pond, orchard, forest };

// Where each place's lamps and fires glow at night, drawn above the night wash.
export const GLOWS: Record<Loc, [number, number, number][]> = {
  meadow: [
    [34, 458, 54],
    [1166, 618, 54],
  ],
  pond: [
    [40, 528, 54],
    [1160, 528, 54],
  ],
  orchard: [
    [1170, 478, 54],
    [980, 370, 80],
  ],
  forest: [[760, 480, 110]],
};
