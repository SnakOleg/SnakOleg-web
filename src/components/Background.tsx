import { useEffect } from "preact/hooks";

const STARS = Array.from({ length: 44 }, (_, i) => {
  const r = (n: number) => (((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1;
  return { x: r(1) * 100, y: r(2) * 100, s: 1 + r(3) * 2, d: r(4) * 6 };
});

export function Background() {
  useEffect(() => {
    const root = document.documentElement;
    const mv = (e: PointerEvent) => {
      root.style.setProperty("--mx", e.clientX + "px");
      root.style.setProperty("--my", e.clientY + "px");
    };
    const sc = () =>
      root.style.setProperty(
        "--sp",
        String(Math.min(1, scrollY / Math.max(1, root.scrollHeight - innerHeight))),
      );
    addEventListener("pointermove", mv);
    addEventListener("scroll", sc, { passive: true });
    return () => {
      removeEventListener("pointermove", mv);
      removeEventListener("scroll", sc);
    };
  }, []);
  return (
    <>
      <div class="prog" aria-hidden="true" />
      <div class="aurora" aria-hidden="true" />
      <div class="glow" aria-hidden="true" />
      <div class="stars" aria-hidden="true">
        {STARS.map((s) => (
          <i style={{ left: s.x + "%", top: s.y + "%", "--s": s.s + "px", "--d": s.d + "s" }} />
        ))}
      </div>
    </>
  );
}
