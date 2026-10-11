import { useEffect, useState } from "preact/hooks";
import { site } from "../config";
import type { L } from "../lib/i18n";
import { Ico } from "./ui/Icon";

export function ToTop({ l }: { l: L }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(scrollY > 700);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      class={`totop${shown ? " shown" : ""}`}
      aria-label={site.ui[l].top}
      tabIndex={shown ? 0 : -1}
      onClick={() => scrollTo({ top: 0, behavior: "smooth" })}
    >
      <Ico n="arrow-up" />
    </button>
  );
}
