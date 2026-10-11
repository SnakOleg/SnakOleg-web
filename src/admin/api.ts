import { demoApi } from "./demo";

export const DEMO = Boolean(import.meta.env.VITE_DEMO);

type Init = { method?: string; body?: unknown };
type Top = Record<string, [string, number][]>;

export async function api<T = any>(path: string, init: Init = {}): Promise<T> {
  if (DEMO) return demoApi(path, init) as Promise<T>;
  const res = await fetch(path, {
    method: init.method ?? "GET",
    credentials: "same-origin",
    headers: {
      "X-Requested-With": "snak-admin",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.error ?? `HTTP ${res.status}`), { status: res.status });
  return data as T;
}

export type Point = { day: string; views: number; visitors: number };
export type Stats = { days: number; today: string; series: Point[]; top: Top; clicks: number };
export type DayInfo = { date: string; views: number; visitors: number; hours: number[]; top: Top };

export type Status = {
  zone: string;
  today: { views: number; visitors: number };
  lastEventDay: string | null;
  sections: { key: string; version: number; updated_at: number }[];
  previousLogin: number | null;
  activeSessions: number;
  env: { telegram: boolean; secret: boolean; admin: boolean; notifications: boolean };
  pendingPresets: number;
};

export type Session = {
  id: string;
  name: string;
  created: number;
  seen: number;
  ip: string;
  last_ip: string;
  country: string;
  last_country: string;
  city: string;
  org: string;
  ua: string;
  revoked: number;
};

export type Attempt = { ts: number; actor: string; ip: string; ua: string; country: string; city: string };
type Blocked = { ip: string; ts: number; reason: string };
export type SessionsReply = { me: string; sessions: Session[]; attempts: Attempt[]; blocked: Blocked[] };
export type AuditRow = {
  ts: number;
  actor: string;
  action: string;
  detail: string;
  ip: string;
  country: string;
  city: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

export const dm = (day: string) => `${day.slice(8)}.${day.slice(5, 7)}`;

export const when = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const dayTitle = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const shortDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

export function ago(ts: number) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "только что";
  if (s < 3600) return `${Math.floor(s / 60)} мин назад`;
  if (s < 86400) return `${Math.floor(s / 3600)} ч назад`;
  return `${Math.floor(s / 86400)} дн назад`;
}

export const flag = (cc: string) =>
  /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0))) : "";

const ACTIONS: Record<string, string> = {
  login: "Вход",
  login_denied: "Отказ во входе",
  content_save: "Сохранение контента",
  content_restore: "Восстановление версии",
  content_reset: "Сброс к коду",
  session_revoked: "Сессия завершена",
  sessions_revoked_others: "Завершены остальные сессии",
  sessions_revoked_all: "Завершены все сессии",
  ip_blocked: "IP заблокирован",
  ip_unblocked: "IP разблокирован",
};

export const actionLabel = (code: string) => ACTIONS[code] ?? code;

export const number1 = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
