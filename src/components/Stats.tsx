import { site } from "../config";
import { github } from "../config/github";
import { snapshot } from "../lib/github";
import type { L } from "../lib/i18n";
import { Num } from "./ui/Num";

const YEAR_MS = 31_557_600_000;

export function Stats({ l }: { l: L }) {
  const u = site.ui[l];
  const c = snapshot.contributions;
  const years = c?.since ? Math.max(1, Math.floor((Date.now() - new Date(c.since).getTime()) / YEAR_MS)) : 0;

  const items = [
    { to: github.totals.repos, label: u.statRepos },
    { to: c?.total ?? 0, label: u.statContrib },
    { to: years, label: u.statYears, plus: true },
    { to: site.projects.filter((p) => p.kind === "order").length, label: u.statClients },
  ].filter((x) => x.to > 0);

  return (
    <ul class="statrow">
      {items.map((x, i) => (
        <li class="rv" style={{ "--i": i }}>
          <Num to={x.to} plus={x.plus} />
          <span>{x.label}</span>
        </li>
      ))}
    </ul>
  );
}
