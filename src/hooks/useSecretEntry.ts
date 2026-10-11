import { useEffect } from "preact/hooks";

const WORD = "admin";
const open = () => location.assign("/admin");

export function useSecretEntry() {
  useEffect(() => {
    let typed = "";
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      typed = (typed + e.key.toLowerCase()).slice(-WORD.length);
      if (typed === WORD) open();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
}
