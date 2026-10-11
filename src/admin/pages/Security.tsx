import { useState } from "preact/hooks";
import { fingerprint, parseUA } from "../../../shared/ua";
import { HELP } from "../help";
import type { Attempt, AuditRow, Session, SessionsReply } from "../api";
import { DEMO, ago, api, flag, when } from "../api";
import { confirmAction, toast } from "../dialogs";
import type { AskOptions } from "../dialogs";
import { Pager, usePaged } from "../lists";
import { Card } from "../ui";
import { useApi } from "../useApi";

type Tone = "ok" | "warn" | "bad" | "info" | "mute";
type Badge = { text: string; tone: Tone };
type Action = { action: string; id?: string; ip?: string; reason?: string };

const TRUST_KEY = "snak-trusted";

const readTrusted = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(TRUST_KEY) ?? "[]");
  } catch {
    return [];
  }
};

function inspect(s: Session, all: Session[], me: string, trusted: string[]) {
  const earlier = all.filter((o) => o.created < s.created);
  const newDevice = earlier.length > 0 && !earlier.some((o) => fingerprint(o.ua) === fingerprint(s.ua));
  const newCountry = earlier.length > 0 && !earlier.some((o) => o.country === s.country);
  const ipChanged = Boolean(s.last_ip) && s.last_ip !== s.ip;
  const countryChanged = Boolean(s.last_country) && s.last_country !== s.country;
  const current = s.id === me;
  const live = !s.revoked && !current;
  const suspicious = live && ((ipChanged && countryChanged) || (newDevice && newCountry));

  const reasons: string[] = [];
  if (newDevice) reasons.push("новое устройство");
  if (newCountry) reasons.push("новая страна");
  if (ipChanged)
    reasons.push(countryChanged ? "IP и страна сменились во время сессии" : "IP сменился во время сессии");

  const badges: Badge[] = [];
  if (current) badges.push({ text: "Это вы", tone: "ok" });
  if (s.revoked) badges.push({ text: "Завершена", tone: "mute" });
  if (suspicious) badges.push({ text: "Подозрительное устройство", tone: "bad" });
  if (!current && newDevice) badges.push({ text: "Новое устройство", tone: "warn" });
  if (!current && newCountry) badges.push({ text: "Новая страна", tone: "warn" });
  if (ipChanged) badges.push({ text: "Сменился IP", tone: countryChanged ? "bad" : "warn" });
  if (live && Date.now() - s.seen > 7 * 864e5) badges.push({ text: "Давно не активна", tone: "mute" });

  const ask = live && !suspicious && !trusted.includes(s.id) && Date.now() - s.created < 3 * 864e5;
  if (ask) badges.push({ text: "Это вы?", tone: "info" });
  return { badges, reasons: current ? [] : reasons, suspicious, ask };
}

const doneText = (body: Action, count: number) => {
  switch (body.action) {
    case "revoke":
      return "Сессия завершена";
    case "revoke_others":
      return count ? `Завершено сессий: ${count}` : "Других активных сессий нет";
    case "revoke_all":
      return "Все сессии завершены, сейчас откроется страница входа";
    case "block":
      return `Адрес ${body.ip} заблокирован: войти с него больше нельзя`;
    default:
      return "Адрес разблокирован";
  }
};

type WhereProps = { ip: string; city: string; country: string; org?: string; last_ip?: string };

function Where({ s }: { s: WhereProps }) {
  return (
    <div class="where">
      <span>
        {flag(s.country)} {[s.city, s.country].filter(Boolean).join(", ")}
      </span>
      <code>{s.ip}</code>
      {s.last_ip && s.last_ip !== s.ip && (
        <small>
          сейчас <code>{s.last_ip}</code>
        </small>
      )}
      {s.org && <small>{s.org}</small>}
    </div>
  );
}

function Devices({ data, reload }: { data: SessionsReply; reload: () => void }) {
  const [trusted, setTrusted] = useState(readTrusted);
  const [busy, setBusy] = useState(false);
  const mine = data.sessions.find((s) => s.id === data.me);
  const myIps = new Set([mine?.ip, mine?.last_ip].filter(Boolean));

  const call = async (body: Action) =>
    api<{ count?: number }>("/api/admin/sessions", { method: "POST", body });

  const act = async (body: Action, confirm?: AskOptions) => {
    if (confirm && !(await confirmAction(confirm))) return;
    setBusy(true);
    try {
      const reply = await call(body);
      toast(doneText(body, reply.count ?? 0));
      if (body.action === "revoke_all" || (body.action === "revoke" && body.id === data.me)) {
        setTimeout(() => location.reload(), 900);
        return;
      }
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const blockable = (s: Session) => [...new Set([s.ip, s.last_ip])].filter((ip) => ip && !myIps.has(ip));

  const block = async (s: Session) => {
    const ips = blockable(s);
    const ok = await confirmAction({
      title: `Заблокировать ${ips.join(" и ")}?`,
      text: "С этого адреса нельзя будет войти в админку, а его активные сессии будут завершены. Сам сайт для него останется доступным. Блокировку можно снять ниже, в списке заблокированных.",
      ok: "Заблокировать",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      for (const ip of ips) await call({ action: "block", ip, reason: "заблокирован из списка устройств" });
      toast(doneText({ action: "block", ip: ips.join(", ") }, 0));
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const trust = (id: string) => {
    const next = [...trusted, id];
    setTrusted(next);
    localStorage.setItem(TRUST_KEY, JSON.stringify(next));
  };

  const active = data.sessions.filter((s) => !s.revoked);
  const rows = [...data.sessions].sort((a, b) => Number(a.revoked) - Number(b.revoked) || b.seen - a.seen);

  return (
    <Card
      title="Устройства"
      note={HELP.devices_security}
      actions={
        <>
          <button
            type="button"
            class="btn"
            disabled={busy || active.length < 2}
            onClick={() =>
              void act(
                { action: "revoke_others" },
                {
                  title: "Завершить остальные сессии?",
                  text: "Текущая сессия останется. На всех других устройствах придётся входить заново.",
                  ok: "Завершить",
                  tone: "danger",
                },
              )
            }
          >
            Завершить остальные
          </button>
          <button
            type="button"
            class="btn dng"
            disabled={busy}
            onClick={() =>
              void act(
                { action: "revoke_all" },
                {
                  title: "Завершить все сессии?",
                  text: "Вас тоже выкинет из админки, потребуется войти через Telegram заново.",
                  ok: "Завершить все",
                  tone: "danger",
                },
              )
            }
          >
            Завершить все
          </button>
        </>
      }
    >
      <ul class="devs">
        {rows.map((s) => {
          const p = parseUA(s.ua);
          const { badges, reasons, suspicious, ask } = inspect(s, data.sessions, data.me, trusted);
          const ips = blockable(s);
          const current = s.id === data.me;
          return (
            <li class={`dev${s.revoked ? " off" : ""}${suspicious ? " bad" : ""}`}>
              <div class="what">
                <b>
                  {p.browser} на {p.os}
                </b>
                <span class="chip">
                  {p.device === "mobile" ? "телефон" : p.device === "tablet" ? "планшет" : "компьютер"}
                </span>
                <div class="badges">
                  {badges.map((b) => (
                    <span
                      class={`chip ${b.tone}`}
                      title={b.tone === "bad" || b.tone === "warn" ? reasons.join(", ") : ""}
                    >
                      {b.text}
                    </span>
                  ))}
                </div>
                {reasons.length > 0 && !s.revoked && <p class="why">Причины: {reasons.join(", ")}</p>}
                <details>
                  <summary>Подробности</summary>
                  <p>
                    <code>{s.ua || "нет данных"}</code>
                  </p>
                  <p class="muted">
                    Сессия {s.id.slice(0, 6)}, аккаунт {s.name}
                  </p>
                </details>
              </div>
              <Where s={s} />
              <div class="times">
                <span>Вход: {when(s.created)}</span>
                <span class="muted">Активность: {ago(s.seen)}</span>
              </div>
              <div class="acts">
                {ask && (
                  <button type="button" class="btn" onClick={() => trust(s.id)}>
                    Это я
                  </button>
                )}
                {!s.revoked && (
                  <button
                    type="button"
                    class="btn dng"
                    disabled={busy}
                    onClick={() => void act({ action: "revoke", id: s.id })}
                  >
                    {current ? "Выйти" : "Завершить"}
                  </button>
                )}
                {!s.revoked && (
                  <button
                    type="button"
                    class="btn dng"
                    disabled={busy || !ips.length}
                    title={ips.length ? "" : "Это ваш адрес, его нельзя заблокировать"}
                    onClick={() => void block(s)}
                  >
                    Блок IP
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Attempts({ data, reload }: { data: SessionsReply; reload: () => void }) {
  const blocked = new Set(data.blocked.map((b) => b.ip));
  const mine = data.sessions.find((s) => s.id === data.me);

  const run = async (body: Action) => {
    try {
      await api("/api/admin/sessions", { method: "POST", body });
      toast(doneText(body, 0));
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const row = (a: Attempt) => {
    const p = parseUA(a.ua);
    const own = a.ip === mine?.ip || a.ip === mine?.last_ip;
    return (
      <tr>
        <td>{when(a.ts)}</td>
        <td>
          <span class="chip bad">чужой аккаунт</span> <code>{a.actor}</code>
        </td>
        <td>
          <Where s={{ ip: a.ip, city: a.city, country: a.country }} />
        </td>
        <td>
          {p.browser}, {p.os}
        </td>
        <td>
          {blocked.has(a.ip) ? (
            <span class="chip mute">заблокирован</span>
          ) : (
            <button
              type="button"
              class="btn dng"
              disabled={own}
              title={own ? "Это ваш адрес, его нельзя заблокировать" : ""}
              onClick={() => void run({ action: "block", ip: a.ip, reason: "неудачный вход" })}
            >
              Блок IP
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <Card title="Попытки входа с чужих аккаунтов" note={HELP.attempts}>
      {data.attempts.length ? (
        <div class="scroll">
          <table class="tbl">
            <thead>
              <tr>
                <th>Время</th>
                <th>Аккаунт</th>
                <th>Откуда</th>
                <th>Устройство</th>
                <th>
                  <span class="sr">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>{data.attempts.map(row)}</tbody>
          </table>
        </div>
      ) : (
        <p class="muted">Неудачных попыток не было.</p>
      )}
      {data.blocked.length > 0 && (
        <>
          <h4 class="sub">Заблокированные адреса</h4>
          <ul class="blocked">
            {data.blocked.map((b) => (
              <li>
                <code>{b.ip}</code>
                <span class="muted">
                  {when(b.ts)} {b.reason}
                </span>
                <button type="button" class="btn" onClick={() => void run({ action: "unblock", ip: b.ip })}>
                  Разблокировать
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

const GROUPS = [
  ["all", "Все события"],
  ["login", "Входы"],
  ["content", "Контент"],
  ["security", "Безопасность"],
] as const;

const groupOf = (action: string) =>
  action.startsWith("login") ? "login" : action.startsWith("content") ? "content" : "security";

function AuditLog({ rows }: { rows: AuditRow[] }) {
  const [group, setGroup] = useState<(typeof GROUPS)[number][0]>("all");
  const filtered = rows.filter((r) => group === "all" || groupOf(r.action) === group);
  const paged = usePaged(filtered, 12);

  return (
    <Card
      title="Журнал действий"
      note={HELP.audit}
      actions={
        <select
          aria-label="Тип событий"
          value={group}
          onChange={(e) => {
            setGroup((e.target as HTMLSelectElement).value as typeof group);
            paged.setPage(0);
          }}
        >
          {GROUPS.map(([id, label]) => (
            <option value={id}>{label}</option>
          ))}
        </select>
      }
    >
      <div class="scroll">
        <table class="tbl">
          <thead>
            <tr>
              <th>Время</th>
              <th>Действие</th>
              <th>Детали</th>
              <th>Откуда</th>
            </tr>
          </thead>
          <tbody>
            {paged.slice.map((r) => (
              <tr>
                <td>{when(r.ts)}</td>
                <td>
                  <span
                    class={`chip ${r.action.includes("denied") || r.action.includes("block") ? "bad" : ""}`}
                  >
                    {r.action}
                  </span>
                </td>
                <td>{r.detail}</td>
                <td>
                  {flag(r.country)} {r.ip}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && <p class="muted">Событий нет</p>}
      <Pager {...paged} />
    </Card>
  );
}

export function Security() {
  const [tick, setTick] = useState(0);
  const sessions = useApi<SessionsReply>(`/api/admin/sessions?t=${tick}`);
  const audit = useApi<{ rows: AuditRow[] }>(`/api/admin/audit?t=${tick}`);
  const reload = () => setTick((n) => n + 1);

  return (
    <>
      {DEMO && <p class="muted">В демо-режиме список устройств состоит из тестовых данных.</p>}
      {sessions.data ? (
        <>
          <Devices data={sessions.data} reload={reload} />
          <Attempts data={sessions.data} reload={reload} />
        </>
      ) : (
        <p class="muted">{sessions.error || "Загрузка..."}</p>
      )}
      <AuditLog rows={audit.data?.rows ?? []} />
      <Card title="Как защищён вход">
        <ul class="sec">
          <li>
            <b>Вход</b> только через Telegram (OpenID Connect с PKCE), доступ по белому списку ID.
          </li>
          <li>
            <b>Сессия</b> живёт 8 часов, кука HttpOnly, Secure и SameSite=Strict. Каждую сессию можно
            завершить отдельно.
          </li>
          <li>
            <b>Запись</b> только с проверкой Origin и специального заголовка. Содержимое проверяется и
            версионируется.
          </li>
        </ul>
      </Card>
    </>
  );
}
