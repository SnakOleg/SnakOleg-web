import raw from "../data/github.json";
import { github } from "../config/github";
import type { RepoRule } from "../config/github";
import type { T } from "../config/i18n";

export type Repo = {
  name: string;
  url: string;
  lang: string | null;
  desc: string;
  fork: boolean;
  commits: number;
  mine: number;
  firstMine: string | null;
  lastMine: string | null;
  hash: string;
  lastDate: string;
  lastMsg: string;
};
type Contributions = {
  total: number;
  since: string | null;
  longest: number;
  years: Record<string, number>;
  days: Record<string, number>;
};

type Snapshot = {
  generatedAt: string;
  user: string;
  repos: Repo[];
  contributions?: Contributions;
};

export const snapshot = raw as unknown as Snapshot;

export type Node = {
  key: string;
  lane: number;
  group: string;
  date: string;
  last: string;
  hash?: string;
  title: string | T;
  desc?: string | T;
  tags: string[];
  url?: string;
  mine?: number;
  commits?: number;
  ref?: string;
  priv?: boolean;
  parents: number[];
};

export function buildNodes(repos: Repo[]): Node[] {
  const byName = new Map(repos.map((r) => [r.name, r]));
  const names = new Set(Object.keys(github.repos));
  if (github.mode === "auto")
    repos.forEach((r) => {
      if (!r.fork && !github.hide.includes(r.name)) names.add(r.name);
    });
  const list: Omit<Node, "parents">[] = [];
  names.forEach((n) => {
    const rule: RepoRule = github.repos[n] ?? { group: "web" };
    const r = byName.get(n);
    if (!r && !rule.private) return;
    list.push({
      key: n,
      group: rule.group,
      lane: github.lanes[rule.group] ?? 0,
      date: rule.date ?? r?.firstMine ?? r?.lastDate ?? "",
      last: (r && (r.fork ? r.lastMine : r.lastDate || r.lastMine)) || rule.date || "",
      hash: r?.hash,
      title: rule.title ?? n,
      desc: rule.desc ?? r?.desc,
      tags: rule.tags ?? (r?.lang ? [r.lang] : []),
      url: rule.private ? undefined : r?.url,
      mine: r?.mine,
      commits: r?.commits,
      priv: rule.private,
    });
  });
  github.events.forEach((e, i) =>
    list.push({
      key: "ev" + i,
      group: e.group,
      lane: github.lanes[e.group] ?? 0,
      date: e.date,
      last: e.date,
      title: e.title,
      desc: e.desc,
      tags: [],
      ref: e.ref,
    }),
  );
  list.sort((a, b) => a.date.localeCompare(b.date));
  const tip: Record<number, number> = {};
  return list.map((n, i) => {
    let parents: number[] = [];
    if (tip[n.lane] !== undefined) parents = [tip[n.lane]];
    else if (n.lane > 0)
      for (let j = i - 1; j >= 0; j--)
        if (list[j].lane < n.lane) {
          parents = [j];
          break;
        }
    tip[n.lane] = i;
    return { ...n, parents };
  });
}

// Browser-side refresh (unauthenticated, public repos only). Throws on rate limit so the snapshot stays.
export async function fetchLive(): Promise<Record<string, Partial<Repo>>> {
  const out: Record<string, Partial<Repo>> = {};
  const r = await fetch(`https://api.github.com/users/${github.user}/repos?per_page=100&sort=pushed`);
  if (!r.ok) throw new Error(String(r.status));
  const list = (await r.json()) as {
    name: string;
    html_url: string;
    language: string | null;
    description: string | null;
    fork: boolean;
  }[];
  const want = new Set(Object.keys(github.repos));
  list.forEach((x) => {
    if (github.mode === "auto" && !x.fork && !github.hide.includes(x.name)) want.add(x.name);
    out[x.name] = {
      name: x.name,
      url: x.html_url,
      lang: x.language,
      desc: x.description ?? "",
      fork: x.fork,
    };
  });
  await Promise.all(
    [...want]
      .filter((n) => out[n])
      .map(async (n) => {
        try {
          const c = await fetch(`https://api.github.com/repos/${github.user}/${n}/commits?per_page=1`);
          if (!c.ok) return;
          const [h] = await c.json();
          Object.assign(out[n], {
            hash: String(h.sha).slice(0, 7),
            lastDate: String(h.commit.committer.date).slice(0, 10),
            lastMsg: String(h.commit.message).split("\n")[0].slice(0, 80),
          });
        } catch {
          /* keep snapshot values */
        }
      }),
  );
  return out;
}

export function merge(base: Repo[], live: Record<string, Partial<Repo>>): Repo[] {
  const seen = new Set<string>();
  const out = base.map((r) => {
    seen.add(r.name);
    return { ...r, ...(live[r.name] ?? {}) } as Repo;
  });
  Object.values(live).forEach((x) => {
    if (x.name && !seen.has(x.name))
      out.push({
        commits: 0,
        mine: 0,
        firstMine: null,
        lastMine: null,
        hash: "",
        lastDate: "",
        lastMsg: "",
        url: "",
        lang: null,
        desc: "",
        fork: false,
        ...x,
      } as Repo);
  });
  return out;
}
