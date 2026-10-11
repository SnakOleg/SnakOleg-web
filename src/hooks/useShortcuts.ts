import { useEffect, useRef } from "preact/hooks";

type Actions = { theme: () => void; lang: () => void };

// Latin and Cyrillic layouts share the physical keys: T/Е and L/Д.
export function useShortcuts(actions: Actions) {
  const latest = useRef(actions);
  latest.current = actions;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]")) return;
      const key = e.key.toLowerCase();
      if (key === "t" || key === "е") latest.current.theme();
      if (key === "l" || key === "д") latest.current.lang();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
}
