import { useEffect, useState } from "preact/hooks";

const KEY = "snak-retro";
const CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

export function useRetro() {
  const [retro, setRetro] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("retro", retro);
    try {
      localStorage.setItem(KEY, retro ? "1" : "0");
    } catch {
      // storage can be blocked
    }
  }, [retro]);

  useEffect(() => {
    let step = 0;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select")) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      step = key === CODE[step] ? step + 1 : key === CODE[0] ? 1 : 0;
      if (step === CODE.length) {
        step = 0;
        setRetro((on) => !on);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  return [retro, setRetro] as const;
}
