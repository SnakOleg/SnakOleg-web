import { useEffect, useState } from "preact/hooks";
import { github } from "../config/github";
import { fetchLive, merge, snapshot } from "../lib/github";
import type { Repo } from "../lib/github";

const KEY = "snak-gh-v1";
const MAX_AGE = 30 * 60 * 1000;

type Live = Record<string, Partial<Repo>>;

function readCache(): Live | null {
  try {
    const cached = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return cached && Date.now() - cached.t < MAX_AGE ? cached.d : null;
  } catch {
    return null;
  }
}

function writeCache(d: Live) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d }));
  } catch {
    // storage can be unavailable (private mode)
  }
}

export function useGithub() {
  const [repos, setRepos] = useState(snapshot.repos);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!github.live) return;
    let cancelled = false;

    const refresh = async () => {
      let data = readCache();
      if (!data) {
        try {
          data = await fetchLive();
          writeCache(data);
        } catch {
          return;
        }
      }
      if (cancelled) return;
      setRepos(merge(snapshot.repos, data));
      setLive(true);
    };

    void refresh();
    return () => {
      cancelled = true;
    };
  }, []);

  return { repos, live, generatedAt: snapshot.generatedAt };
}

export type GH = ReturnType<typeof useGithub>;
