// Refreshes src/data/github.json
//   node scripts/sync-github.mjs                    repos (GitHub API) + contribution calendar
//   node scripts/sync-github.mjs --only=contributions
// Optional env: GH_USER, GH_SINCE_YEAR, GITHUB_TOKEN (raises API limits, lets you list private repos),
// INCLUDE_PRIVATE=repo1,repo2 (private repos to include; only those are written to the file)
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../src/data/github.json", import.meta.url);
const user = process.env.GH_USER ?? "SnakOleg";
const sinceYear = Number(process.env.GH_SINCE_YEAR) || 2019;
const token = process.env.GITHUB_TOKEN;
const onlyContributions = process.argv.includes("--only=contributions");
const privateAllowed = new Set((process.env.INCLUDE_PRIVATE ?? "").split(",").filter(Boolean));

const api = async (path) => {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "portfolio-sync" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res;
};

const lastPage = (res) => Number(/page=(\d+)>; rel="last"/.exec(res.headers.get("link") ?? "")?.[1]) || 0;

async function commitInfo(repo, author = "") {
  const query = `/repos/${user}/${repo}/commits?per_page=1${author}`;
  const res = await api(query);
  const [head] = await res.json();
  if (!head) return { count: 0 };
  const count = lastPage(res) || 1;
  const first = count > 1 ? (await (await api(`${query}&page=${count}`)).json())[0] : head;
  return { count, head, first };
}

const day = (commit) => commit?.commit.committer.date.slice(0, 10) ?? null;

async function loadRepos() {
  const listPath = token
    ? "/user/repos?per_page=100&affiliation=owner&sort=pushed"
    : `/users/${user}/repos?per_page=100&sort=pushed`;
  const list = await (await api(listPath)).json();
  const repos = [];

  for (const item of list) {
    if (item.private && !privateAllowed.has(item.name)) continue;
    const all = await commitInfo(item.name);
    const mine = await commitInfo(item.name, `&author=${user}`);
    repos.push({
      name: item.name,
      url: item.private ? "" : item.html_url,
      lang: item.language,
      desc: item.private ? "" : (item.description ?? ""),
      fork: item.fork,
      commits: all.count,
      mine: mine.count,
      firstMine: day(mine.first),
      lastMine: day(mine.head),
      hash: all.head?.sha.slice(0, 7) ?? "",
      lastDate: day(all.head) ?? "",
      lastMsg: item.private ? "" : (all.head?.commit.message ?? "").split("\n")[0].slice(0, 80),
    });
    console.log(item.name, all.count, mine.count);
  }
  return repos;
}

// The public contribution calendar already includes private work when the profile setting is on.
async function loadContributions() {
  const years = {};
  const days = new Map();

  for (let year = sinceYear; year <= new Date().getFullYear(); year++) {
    const url = `https://github.com/users/${user}/contributions?from=${year}-01-01&to=${year}-12-31`;
    const res = await fetch(url, { headers: { "User-Agent": "portfolio-sync" } });
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    const html = await res.text();

    const tips = new Map(
      [
        ...html.matchAll(
          /<tool-tip[^>]*for="(contribution-day-component-\d+-\d+)"[^>]*>([^<]*)<\/tool-tip>/g,
        ),
      ].map((m) => [m[1], Number(/^(\d+) contribution/.exec(m[2].trim())?.[1] ?? 0)]),
    );
    let total = 0;
    for (const m of html.matchAll(
      /data-date="(\d{4}-\d{2}-\d{2})"[^>]*id="(contribution-day-component-\d+-\d+)"/g,
    )) {
      const count = tips.get(m[2]) ?? 0;
      days.set(m[1], count);
      total += count;
    }
    years[year] = total;
  }

  const today = new Date().toISOString().slice(0, 10);
  const all = [...days].filter(([date]) => date <= today).sort(([a], [b]) => a.localeCompare(b));
  const since = all.find(([, count]) => count > 0)?.[0] ?? null;

  let longest = 0;
  let run = 0;
  for (const [, count] of all) {
    run = count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  return {
    total: Object.values(years).reduce((a, b) => a + b, 0),
    since,
    longest,
    years,
    days: Object.fromEntries(all.filter(([, count]) => count > 0)),
  };
}

const previous = JSON.parse(readFileSync(file, "utf8"));
const next = { ...previous, generatedAt: new Date().toISOString(), user };

if (!onlyContributions) {
  try {
    next.repos = await loadRepos();
  } catch (error) {
    console.warn("repos skipped:", error.message);
  }
}
try {
  next.contributions = await loadContributions();
  console.log("contributions", next.contributions.total, "since", next.contributions.since);
} catch (error) {
  console.warn("contributions skipped:", error.message);
}

writeFileSync(file, JSON.stringify(next, null, 1));
