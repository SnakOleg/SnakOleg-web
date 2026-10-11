import { useEffect, useState } from "preact/hooks";
import type { L } from "../lib/i18n";

const KEY = "snak-lang";

export function useLang() {
  const [l, setL] = useState<L>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "ru" || saved === "en") return saved;
    } catch {
      // storage can be blocked
    }
    return "ru";
  });

  useEffect(() => {
    document.documentElement.lang = l;
    try {
      localStorage.setItem(KEY, l);
    } catch {
      // ignore
    }
  }, [l]);

  return [l, setL] as const;
}
