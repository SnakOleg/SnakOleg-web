import { useEffect } from "preact/hooks";

const COLORS = ["#00ffd0", "#ff2bd6", "#fff35c", "#8a7dff"];

export function useTrail(on: boolean) {
  useEffect(() => {
    if (!on || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let last = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.timeStamp - last < 45) return;
      last = e.timeStamp;
      const spark = document.createElement("span");
      spark.className = "spark";
      spark.textContent = "✦";
      spark.setAttribute("aria-hidden", "true");
      spark.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;color:${COLORS[Math.floor(Math.random() * COLORS.length)]}`;
      spark.addEventListener("animationend", () => spark.remove());
      document.body.append(spark);
    };
    addEventListener("pointermove", onMove);
    return () => removeEventListener("pointermove", onMove);
  }, [on]);
}
