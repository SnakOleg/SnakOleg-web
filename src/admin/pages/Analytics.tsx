import { useMemo, useState } from "preact/hooks";
import { CalendarHeat } from "../../components/charts/CalendarHeat";
import { HELP } from "../help";
import type { DayInfo, Stats } from "../api";
import { dayTitle, shortDay } from "../api";
import { Donut, HourBars, Kpi, TrendChart } from "../charts";
import { BarTable } from "../lists";
import { Card, Note } from "../ui";
import { useApi } from "../useApi";

const TABS = [
  ["dyn", "Динамика"],
  ["cal", "Календарь и дни"],
  ["src", "Источники и клики"],
  ["aud", "Аудитория"],
] as const;

type Tab = (typeof TABS)[number][0];

const shift = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T12:00:00Z`) + days * 864e5).toISOString().slice(0, 10);

const downloadCsv = (stats: Stats) => {
  const rows = ["date,views,visitors", ...stats.series.map((d) => `${d.day},${d.views},${d.visitors}`)];
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" })),
    download: `analytics-${stats.series[0]?.day}-${stats.today}.csv`,
  });
  link.click();
  URL.revokeObjectURL(link.href);
};

export function Analytics() {
  const [tab, setTab] = useState<Tab>("dyn");
  const [days, setDays] = useState(30);
  const [picked, setPicked] = useState("");
  const period = useApi<Stats>(`/api/admin/stats?days=${days}`);
  const year = useApi<Stats>("/api/admin/stats?days=365&only=series");

  const today = year.data?.today ?? "";
  const selected = picked || today;
  const day = useApi<DayInfo>(tab === "cal" && selected ? `/api/admin/day?date=${selected}` : null);

  const calendar = useMemo(
    () => (year.data?.series ?? []).map((d): [string, number] => [d.day, d.views]),
    [year.data],
  );
  const first = year.data?.series[0]?.day ?? "";
  const s = period.data;
  const total = s ? s.series.reduce((a, d) => a + d.views, 0) : 0;
  const best = s ? s.series.reduce((a, d) => (d.views > a.views ? d : a), s.series[0]) : null;
  const average = s ? total / s.series.length : 0;

  const pickDay = (date: string) => {
    setPicked(date);
    setTab("cal");
  };

  return (
    <>
      <div class="tabs main">
        {TABS.map(([id, label]) => (
          <button type="button" class={id === tab ? "on" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab !== "cal" && (
        <div class="tabs">
          {[7, 30, 90].map((d) => (
            <button type="button" class={d === days ? "on" : ""} onClick={() => setDays(d)}>
              {d} дней
            </button>
          ))}
          <span class="sp" />
          <button type="button" class="btn" disabled={!s} onClick={() => s && downloadCsv(s)}>
            Скачать CSV
          </button>
        </div>
      )}

      {tab !== "cal" && !s && <p class="muted">{period.error || "Загрузка..."}</p>}

      {tab === "dyn" && s && (
        <>
          <div class="cards">
            <Kpi label="Просмотры за период" value={total} note={HELP.views} />
            <Kpi
              label="В среднем за день"
              value={average.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}
              sub="просмотров"
            />
            <Kpi label="Лучший день" value={best?.views ?? 0} sub={best ? shortDay(best.day) : ""} />
            <Kpi label="Клики по ссылкам" value={s.clicks} note={HELP.clicks} />
          </div>
          <Card title="Динамика" note={HELP.chart}>
            <TrendChart data={s.series} today={s.today} selected={selected} onPick={pickDay} />
          </Card>
        </>
      )}

      {tab === "cal" && (
        <>
          <Card title="Календарь активности" note={HELP.calendar}>
            {year.data ? (
              <CalendarHeat
                days={calendar}
                locale="ru-RU"
                selected={selected}
                onPick={setPicked}
                label={(date, n) => `${shortDay(date)}: ${n}`}
              />
            ) : (
              <p class="muted">Загрузка...</p>
            )}
          </Card>

          <Card
            title={selected ? dayTitle(selected) : "День"}
            class="dayc"
            actions={
              <div class="daynav">
                <button
                  type="button"
                  class="btn"
                  disabled={!selected || selected <= first}
                  onClick={() => setPicked(shift(selected, -1))}
                >
                  Назад
                </button>
                <button
                  type="button"
                  class="btn"
                  disabled={!selected || selected >= today}
                  onClick={() => setPicked(shift(selected, 1))}
                >
                  Вперёд
                </button>
                <button
                  type="button"
                  class="btn pri"
                  disabled={selected === today}
                  onClick={() => setPicked("")}
                >
                  Сегодня
                </button>
              </div>
            }
          >
            {!day.data ? (
              <p class="muted">{day.error || "Загрузка..."}</p>
            ) : (
              <>
                <div class="cards small">
                  <Kpi label="Просмотры" value={day.data.views} />
                  <Kpi label="Посетители" value={day.data.visitors} />
                  <Kpi label="Клики" value={(day.data.top.click ?? []).reduce((a, c) => a + c[1], 0)} />
                </div>
                <h4 class="sub">
                  Когда заходили
                  <Note text={HELP.hours} />
                </h4>
                <HourBars hours={day.data.hours} />
                <div class="g3 in">
                  <div>
                    <h4 class="sub">Источники</h4>
                    <BarTable items={day.data.top.ref ?? []} size={5} />
                  </div>
                  <div>
                    <h4 class="sub">Страны</h4>
                    <BarTable items={day.data.top.country ?? []} size={5} />
                  </div>
                  <div>
                    <h4 class="sub">Клики</h4>
                    <BarTable items={day.data.top.click ?? []} size={5} />
                  </div>
                </div>
              </>
            )}
          </Card>
        </>
      )}

      {tab === "src" && s && (
        <div class="g3">
          <Card title="Источники трафика" note={HELP.sources}>
            <BarTable items={s.top.ref ?? []} />
          </Card>
          <Card title="Клики по ссылкам" note={HELP.clicks}>
            <BarTable items={s.top.click ?? []} />
          </Card>
          <Card title="Страницы" note={HELP.pages}>
            <BarTable items={s.top.path ?? []} />
          </Card>
        </div>
      )}

      {tab === "aud" && s && (
        <div class="g3">
          <Card title="Страны" note={HELP.countries}>
            <BarTable items={s.top.country ?? []} />
          </Card>
          <Card title="Устройства" note={HELP.devices}>
            <Donut items={s.top.device ?? []} />
          </Card>
          <Card title="Язык сайта" note={HELP.lang}>
            <Donut items={s.top.lang ?? []} />
          </Card>
        </div>
      )}
    </>
  );
}
