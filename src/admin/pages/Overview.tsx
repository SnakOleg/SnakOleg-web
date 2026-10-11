import { snapshot } from "../../lib/github";
import { SECTIONS } from "../schema";
import { HELP, HOW } from "../help";
import type { AuditRow, Stats, Status } from "../api";
import { actionLabel, ago, when } from "../api";
import { TrendChart, BarList, Donut, Kpi } from "../charts";
import { LinkCheck } from "../LinkCheck";
import { Card } from "../ui";
import { useApi } from "../useApi";

type Tone = "ok" | "warn" | "bad";

function StatusRow({ tone, label, value }: { tone: Tone; label: string; value: string }) {
  return (
    <li>
      <i class={tone} />
      <span>{label}</span>
      <b>{value}</b>
    </li>
  );
}

function SystemStatus({ s }: { s: Status }) {
  const lastEdit = Math.max(0, ...s.sections.map((x) => x.updated_at));
  const fresh = s.lastEventDay && Date.now() - new Date(`${s.lastEventDay}T12:00:00`).getTime() < 3 * 864e5;
  return (
    <Card title="Состояние системы" note={HELP.status}>
      <ul class="sts">
        <StatusRow
          tone={s.today.views > 0 ? "ok" : fresh ? "warn" : "bad"}
          label="Счётчик посещений"
          value={s.lastEventDay ? `сегодня ${s.today.views}` : "данных нет"}
        />
        <StatusRow tone="ok" label="Часовой пояс статистики" value={s.zone} />
        <StatusRow
          tone={s.env.telegram ? "ok" : "bad"}
          label="Вход через Telegram"
          value={s.env.telegram ? "настроен" : "не настроен"}
        />
        <StatusRow
          tone={s.env.secret ? "ok" : "bad"}
          label="Секрет сессий"
          value={s.env.secret ? "надёжный" : "слишком короткий"}
        />
        <StatusRow
          tone={s.env.admin ? "ok" : "bad"}
          label="Telegram ID владельца"
          value={s.env.admin ? "задан" : "не задан"}
        />
        <StatusRow tone="ok" label="Активные сессии" value={String(s.activeSessions)} />
        <StatusRow
          tone={s.env.notifications ? "ok" : "warn"}
          label="Уведомления в Telegram"
          value={s.env.notifications ? "включены" : "выключены (необязательно)"}
        />
        <StatusRow
          tone={s.pendingPresets ? "warn" : "ok"}
          label="Темы на проверке"
          value={s.pendingPresets ? String(s.pendingPresets) : "нет"}
        />
        <StatusRow
          tone={s.sections.length ? "ok" : "warn"}
          label="Контент из админки"
          value={
            s.sections.length
              ? `${s.sections.length} из ${SECTIONS.length} разделов, ${ago(lastEdit)}`
              : "значения из кода"
          }
        />
        <StatusRow tone="ok" label="Снимок GitHub" value={snapshot.generatedAt.slice(0, 10)} />
        <StatusRow
          tone="ok"
          label="Прошлый вход"
          value={s.previousLogin ? when(s.previousLogin) : "это первый вход"}
        />
      </ul>
    </Card>
  );
}

export function Overview() {
  const stats = useApi<Stats>("/api/admin/stats?days=30");
  const status = useApi<Status>("/api/admin/status");
  const audit = useApi<{ rows: AuditRow[] }>("/api/admin/audit");

  if (stats.error) return <div class="card">Ошибка: {stats.error}</div>;
  const s = stats.data;
  if (!s) return <p class="muted">Загрузка...</p>;

  const sum = (key: "views" | "visitors", from = 0) => s.series.slice(from).reduce((a, d) => a + d[key], 0);
  const week = sum("views", s.series.length - 7);
  const before = s.series.slice(-14, -7).reduce((a, d) => a + d.views, 0);
  const delta = before ? `${week >= before ? "+" : ""}${Math.round(((week - before) / before) * 100)}%` : "";

  return (
    <>
      <div class="cards">
        <Kpi
          label="Просмотры за 30 дней"
          value={sum("views")}
          sub={`за 7 дней: ${week} ${delta}`}
          note={HELP.views}
          spark={s.series.map((d) => d.views)}
        />
        <Kpi
          label="Посетители за 30 дней"
          value={sum("visitors")}
          sub="сумма уникальных по дням"
          note={HELP.visitors}
          spark={s.series.map((d) => d.visitors)}
        />
        <Kpi label="Клики по ссылкам" value={s.clicks} sub="за 30 дней" note={HELP.clicks} />
        <Kpi
          label="Вклады на GitHub"
          value={snapshot.contributions?.total ?? 0}
          sub="с приватными репозиториями"
          note={HELP.github}
        />
      </div>

      <div class="g2">
        <Card title="Просмотры за 30 дней" note={HELP.chart}>
          <TrendChart data={s.series} today={s.today} />
        </Card>
        {status.data ? (
          <SystemStatus s={status.data} />
        ) : (
          <Card title="Состояние системы">{status.error || "Загрузка..."}</Card>
        )}
      </div>

      <div class="g3">
        <Card title="Источники" note={HELP.sources}>
          <BarList items={(s.top.ref ?? []).slice(0, 6)} />
        </Card>
        <Card title="Страны" note={HELP.countries}>
          <BarList items={(s.top.country ?? []).slice(0, 6)} />
        </Card>
        <Card title="Устройства" note={HELP.devices}>
          <Donut items={s.top.device ?? []} />
        </Card>
      </div>

      <div class="g2b">
        <Card title="Последние действия" note={HELP.audit}>
          <ul class="feed">
            {(audit.data?.rows ?? []).slice(0, 7).map((r) => (
              <li>
                <b title={r.action}>{actionLabel(r.action)}</b>
                <span>{r.detail}</span>
                <time>{when(r.ts)}</time>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Как считаются данные">
          <ol class="how">
            {HOW.map((line) => (
              <li>{line}</li>
            ))}
          </ol>
        </Card>
      </div>
      <LinkCheck />
    </>
  );
}
