import { useEffect, useState } from "preact/hooks";
import { animate } from "motion";

export function Loader({ skip = false }: { skip?: boolean }) {
  const [pct, setPct] = useState(0);
  const [ready, setReady] = useState(skip);
  useEffect(() => {
    if (skip) return;
    const a = animate(0, 100, {
      duration: 1.3,
      ease: "easeInOut",
      onUpdate: (v: number) => setPct(Math.round(v)),
      onComplete: () => setTimeout(() => setReady(true), 250),
    });
    return () => a.stop();
  }, []);
  return (
    <div class={"loader" + (ready ? " gone" : "")} aria-hidden={ready}>
      <div class="lm">S</div>
      <div class="lp">{pct}%</div>
      <div class="lb">
        <i style={{ width: pct + "%" }} />
      </div>
    </div>
  );
}
