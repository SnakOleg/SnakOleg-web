import { useEffect, useRef } from "preact/hooks";
import { Engine } from "./engine";
import type { Layer } from "./engine";
import { bats, clouds, fog, hearts, lightning, rain, snow } from "./layers";
import { holidayToday, planFromCode, planFromSky } from "./prefs";
import type { Plan, Report, WxPrefs } from "./prefs";
import cobweb from "../assets/illustrations/holiday/cobweb.svg";
import "./weather.scss";

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function resolve(p: WxPrefs, report: Report | null | "none") {
  const calm = reducedMotion();
  let plan: Plan | null = null;
  if (p.sky === "auto")
    plan = !calm && report && report !== "none" ? planFromCode(report.code, report.wind) : null;
  else if (p.sky !== "off") plan = planFromSky(p.sky);
  const holiday =
    p.holiday === "auto" ? (calm ? null : holidayToday()) : p.holiday === "off" ? null : p.holiday;
  return { plan, holiday };
}

const layersFor = (plan: Plan | null, holiday: string | null) => {
  const out: Layer[] = [];
  const k = plan?.kind;
  if (k === "clouds" || k === "rain" || k === "downpour" || k === "storm") out.push(clouds());
  if (k === "fog") out.push(fog());
  if (k === "storm") out.push(lightning());
  if (k === "rain") out.push(rain(false));
  if (k === "downpour" || k === "storm") out.push(rain(true));
  if (k === "snow" || (holiday === "newyear" && k !== "rain" && k !== "downpour" && k !== "storm"))
    out.push(snow());
  if (holiday === "halloween") out.push(bats());
  if (holiday === "valentine") out.push(hearts());
  return out;
};

export function Weather({ prefs, report }: { prefs: WxPrefs; report: Report | null | "none" }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);
  const { plan, holiday } = resolve(prefs, report);

  useEffect(() => {
    engine.current = new Engine(canvas.current!);
    return () => engine.current?.destroy();
  }, []);

  useEffect(() => {
    const snowOnly = !plan || plan.kind === "clear" || plan.kind === "clouds" || plan.kind === "fog";
    const density = plan?.density || (holiday === "newyear" && snowOnly ? 0.5 : 1);
    engine.current?.set(layersFor(plan, holiday), plan?.wind ?? 0.2, density);
  }, [plan?.kind, plan?.density, plan?.wind, holiday]);

  return (
    <>
      <canvas class="wx" ref={canvas} aria-hidden="true" />
      {holiday === "newyear" && <Garland />}
      {holiday === "halloween" && <img class="web" src={cobweb} alt="" aria-hidden="true" />}
    </>
  );
}

const BULBS = 28;

function Garland() {
  return (
    <div class="garland" aria-hidden="true">
      <svg viewBox="0 0 1000 40" preserveAspectRatio="none">
        <path d="M0 4 Q 125 30 250 6 T 500 6 T 750 6 T 1000 4" />
      </svg>
      {Array.from({ length: BULBS }, (_, i) => {
        const x = (i + 0.5) / BULBS;
        const y = 4 + 18 * Math.abs(Math.sin(x * Math.PI * 4));
        return <i style={{ left: `${x * 100}%`, top: `${y}px`, "--d": `${(i % 4) * 0.4}s` }} />;
      })}
    </div>
  );
}
