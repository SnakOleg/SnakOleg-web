import { useMemo, useState } from "preact/hooks";
import { site } from "../config";
import { snapshot } from "../lib/github";
import { fmt, plural } from "../lib/i18n";
import type { L } from "../lib/i18n";
import { CalendarHeat } from "./charts/CalendarHeat";

type Day = [string, number];

function fullYear(year: string, counts: Record<string, number>): Day[] {
  const today = new Date().toISOString().slice(0, 10);
  const days: Day[] = [];
  for (let t = Date.UTC(Number(year), 0, 1); ; t += 864e5) {
    const date = new Date(t).toISOString().slice(0, 10);
    if (date.slice(0, 4) !== year || date > today) break;
    days.push([date, counts[date] ?? 0]);
  }
  return days;
}

export function GitHubActivity({ l }: { l: L }) {
  const data = snapshot.contributions;
  const years = data ? Object.keys(data.years).filter((y) => data.years[y] > 0) : [];
  const peak = data ? years.reduce((a, y) => (data.years[y] > data.years[a] ? y : a), years[0]) : "";
  const [year, setYear] = useState(peak);
  const days = useMemo(() => (data ? fullYear(year, data.days) : []), [year, data]);
  if (!data || !years.length) return null;
  const u = site.ui[l];
  const word = (n: number) => plural(n, l, ["вклад", "вклада", "вкладов"], ["contribution", "contributions"]);
  const label = (date: string, n: number) => `${n} ${word(n)} · ${fmt(date, l, true)}`;

  return (
    <section class="activity rv" aria-labelledby="activity-title">
      <header>
        <h2 id="activity-title">{u.activity}</h2>
        <span>
          {data.total.toLocaleString(l === "ru" ? "ru-RU" : "en-US")} {word(data.total)} · {u.activityNote}
        </span>
      </header>
      <div class="ytabs" role="tablist">
        {years.map((y) => (
          <button
            type="button"
            role="tab"
            aria-selected={y === year}
            class={y === year ? "on" : ""}
            onClick={() => setYear(y)}
          >
            {y}
            <small>{data.years[y].toLocaleString(l === "ru" ? "ru-RU" : "en-US")}</small>
          </button>
        ))}
      </div>
      <CalendarHeat days={days} locale={l === "ru" ? "ru-RU" : "en-US"} label={label} />
      <footer>
        <span>
          {u.longest}: <b>{data.longest}</b>
        </span>
        <span class="legend">
          {u.less}
          {[0, 1, 2, 3, 4].map((n) => (
            <i class={`d l${n}`} />
          ))}
          {u.more}
        </span>
      </footer>
    </section>
  );
}
