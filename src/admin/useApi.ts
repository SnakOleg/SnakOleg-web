import { useEffect, useState } from "preact/hooks";
import { api } from "./api";

export function useApi<T>(path: string | null) {
  const [state, setState] = useState<{ data: T | null; error: string }>({ data: null, error: "" });

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setState({ data: null, error: "" });
    api<T>(path).then(
      (data) => {
        if (!cancelled) setState({ data, error: "" });
      },
      (error: Error) => {
        if (!cancelled) setState({ data: null, error: error.message });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}
