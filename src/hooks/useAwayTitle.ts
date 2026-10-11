import { useEffect } from "preact/hooks";

export function useAwayTitle(text: string) {
  useEffect(() => {
    const original = document.title;
    const onChange = () => {
      document.title = document.hidden ? text : original;
    };
    document.addEventListener("visibilitychange", onChange);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      document.title = original;
    };
  }, [text]);
}
