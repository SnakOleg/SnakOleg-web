import { useEffect, useState } from "preact/hooks";

export function useType(words: string[]) {
  const [s, setS] = useState("");
  useEffect(() => {
    let i = 0,
      j = 0,
      del = false,
      id = 0;
    const tick = () => {
      const w = words[i % words.length];
      j += del ? -1 : 1;
      setS(w.slice(0, j));
      let d = del ? 30 : 65;
      if (!del && j === w.length) {
        if (words.length === 1) return;
        del = true;
        d = 1500;
      } else if (del && j === 0) {
        del = false;
        i++;
        d = 300;
      }
      id = window.setTimeout(tick, d);
    };
    tick();
    return () => clearTimeout(id);
  }, [words.join("|")]);
  return s;
}
