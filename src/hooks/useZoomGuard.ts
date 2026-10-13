import { useEffect } from "preact/hooks";

// Pinch and double tap zoom re-rasterize every blurred and animated layer at the new scale, which is what made the page stutter.
// While the page is zoomed in, the heavy effects are switched off by the "zoomed" class.
export function useZoomGuard() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const check = () => root.classList.toggle("zoomed", vv.scale > 1.05);
    check();
    vv.addEventListener("resize", check);
    return () => {
      vv.removeEventListener("resize", check);
      root.classList.remove("zoomed");
    };
  }, []);
}
