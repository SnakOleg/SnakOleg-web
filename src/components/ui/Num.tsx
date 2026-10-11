import { useEffect, useRef } from "preact/hooks";
import { animate, inView } from "motion";

export function Num({ to, plus }: { to: number; plus?: boolean }) {
  const r = useRef<HTMLElement>(null);
  useEffect(
    () =>
      inView(r.current!, () => {
        animate(0, to, {
          duration: 1.6,
          ease: "easeOut",
          onUpdate: (v: number) => {
            if (r.current) r.current.textContent = Math.round(v).toLocaleString("ru-RU") + (plus ? "+" : "");
          },
        });
      }),
    [to],
  );
  return <b ref={r}>0</b>;
}
