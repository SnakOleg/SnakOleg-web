import { useState } from "preact/hooks";
import { DEFAULT_SETTINGS } from "../../../shared/blog";
import type { BlogSettings } from "../../../shared/blog";
import { api, when } from "../api";
import { confirmAction, toast } from "../dialogs";
import { Card } from "../ui";
import { useApi } from "../useApi";
import { BanDialog } from "./BanDialog";
import type { BanTarget } from "./BanDialog";

type Counts = {
  flagged: number;
  pending: number;
  reported: number;
  users: number;
  bans: number;
  themes: number;
};
type Overview = { counts: Counts; settings: BlogSettings };
type Comment = {
  id: number;
  post: string | null;
  user_id: string;
  body: string;
  status: string;
  flags: string[];
  reports: number;
  created: number;
  name: string | null;
  username: string | null;
  total: number;
  banned: number;
};
type User = {
  id: string;
  name: string;
  username: string | null;
  created: number;
  seen: number;
  comments: number;
  trusted: number;
  flagged: number;
  themes: number;
  ban: string | null;
};
type Ban = {
  id: number;
  user_id: string;
  scope: string;
  reason: string;
  created: number;
  until: number | null;
  lifted: number;
  name: string | null;
  username: string | null;
};

const TABS = [
  ["comments", "Комментарии"],
  ["users", "Пользователи"],
  ["bans", "Баны"],
  ["settings", "Настройки"],
] as const;
const FILTERS = [
  ["flagged", "Возможный спам"],
  ["pending", "На проверке"],
  ["reported", "Жалобы"],
  ["hidden", "Скрытые"],
  ["all", "Все"],
] as const;
const FLAG: Record<string, string> = {
  links: "ссылки",
  invite: "приглашения",
  short: "короткие ссылки",
  ads: "реклама",
  abuse: "оскорбления",
  caps: "КАПС",
  repeat: "повторы",
  copy: "копия чужого",
  reports: "жалобы",
};
const ST: Record<string, string> = {
  flagged: "возможный спам",
  pending: "на проверке",
  hidden: "скрыт",
  deleted: "удалён",
};
const SCOPE: Record<string, string> = { blog: "блог", themes: "темы", all: "всё" };

const post = (body: Record<string, unknown>, ok = "Готово") =>
  api("/api/admin/community", { method: "POST", body }).then(
    () => toast(ok),
    (e: Error) => toast(e.message, "error"),
  );
const who = (n: string | null, u: string | null) => (n || "?") + (u ? ` @${u}` : "");

function Comments({ counts, reloadAll }: { counts: Counts; reloadAll: () => void }) {
  const [status, setStatus] = useState<(typeof FILTERS)[number][0]>(
    counts.flagged ? "flagged" : counts.pending ? "pending" : "reported",
  );
  const [tick, setTick] = useState(0);
  const [ban, setBan] = useState<BanTarget | null>(null);
  const data = useApi<{ comments: Comment[] }>(
    `/api/admin/community?tab=comments&status=${status}&t=${tick}`,
  );
  const reload = () => {
    setTick((n) => n + 1);
    reloadAll();
  };
  const act = async (id: number, to: string) => {
    await post({ action: "comment", id, to });
    reload();
  };

  return (
    <>
      <div class="tabs">
        {FILTERS.map(([id, label]) => (
          <button type="button" class={id === status ? "on" : ""} onClick={() => setStatus(id)}>
            {label}
            {id in counts ? ` (${counts[id as keyof Counts]})` : ""}
          </button>
        ))}
      </div>
      {!data.data ? (
        <p class="muted">{data.error || "Загрузка..."}</p>
      ) : data.data.comments.length ? (
        <ul class="plist">
          {data.data.comments.map((c) => (
            <li class="crow">
              <div class="meta">
                <div class="who2">
                  <b>{c.name || "?"}</b>
                  {c.username && <span class="muted">@{c.username}</span>}
                  <span class="muted">{c.total} комм.</span>
                  <span class="muted">{when(c.created)}</span>
                </div>
                <div class="muted on">к посту «{c.post ?? "?"}»</div>
                <div class="tags2">
                  {c.banned ? <span class="chip bad">в бане</span> : null}
                  {c.status !== "visible" && <span class="chip mute">{ST[c.status] ?? c.status}</span>}
                  {c.reports > 0 && <span class="chip warn">жалоб: {c.reports}</span>}
                  {c.flags.map((f) => (
                    <span class="chip info">{FLAG[f] ?? f}</span>
                  ))}
                </div>
                <div class="cbod">{c.body || <i class="muted">(текст удалён)</i>}</div>
              </div>
              <div class="acts">
                {c.status !== "visible" && (
                  <button type="button" class="btn pri" onClick={() => void act(c.id, "visible")}>
                    Это не спам
                  </button>
                )}
                {c.status !== "hidden" && (
                  <button type="button" class="btn" onClick={() => void act(c.id, "hidden")}>
                    Скрыть
                  </button>
                )}
                <button type="button" class="btn dng" onClick={() => void act(c.id, "deleted")}>
                  Удалить
                </button>
                {!c.banned && (
                  <button
                    type="button"
                    class="btn dng"
                    onClick={() => setBan({ id: c.user_id, name: who(c.name, c.username), purge: true })}
                  >
                    Спам: бан
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p class="muted">Здесь чисто.</p>
      )}
      {ban && (
        <BanDialog
          target={ban}
          onClose={() => setBan(null)}
          onDone={() => {
            setBan(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function Users({ reloadAll }: { reloadAll: () => void }) {
  const [q, setQ] = useState("");
  const [tick, setTick] = useState(0);
  const [ban, setBan] = useState<BanTarget | null>(null);
  const data = useApi<{ users: User[] }>(
    `/api/admin/community?tab=users&q=${encodeURIComponent(q)}&t=${tick}`,
  );
  const reload = () => {
    setTick((n) => n + 1);
    reloadAll();
  };
  const run = async (body: Record<string, unknown>, ask?: string) => {
    if (ask && !(await confirmAction({ title: ask, text: "Это нельзя отменить.", ok: "Да", tone: "danger" })))
      return;
    await post(body);
    reload();
  };

  return (
    <>
      <p class="muted hint">
        «Доверенный» значит: комментарии человека не задерживаются на проверке, даже если включена
        предмодерация новичков. Спам-фильтр и жалобы действуют как обычно.
      </p>
      <input
        class="search"
        type="search"
        placeholder="Имя, @username или id"
        aria-label="Поиск"
        value={q}
        onInput={(e) => setQ((e.target as HTMLInputElement).value)}
      />
      {!data.data ? (
        <p class="muted">{data.error || "Загрузка..."}</p>
      ) : data.data.users.length ? (
        <ul class="plist">
          {data.data.users.map((u) => {
            const [scope, , reason] = (u.ban ?? "").split("|");
            return (
              <li class="crow">
                <div class="meta">
                  <b>{who(u.name, u.username)}</b>
                  <p class="muted">
                    id {u.id} · с {when(u.created)} · был {when(u.seen)} · комм.: {u.comments} · спам:{" "}
                    {u.flagged} · тем: {u.themes}
                    {u.trusted ? (
                      <span class="chip ok" title="Комментарии без предмодерации">
                        доверенный
                      </span>
                    ) : null}
                    {u.ban && (
                      <span class="chip bad">
                        {" "}
                        бан: {SCOPE[scope] ?? scope}
                        {reason ? `: ${reason}` : ""}
                      </span>
                    )}
                  </p>
                </div>
                <div class="acts">
                  {u.ban ? (
                    <button
                      type="button"
                      class="btn pri"
                      onClick={() => void run({ action: "unban", user: u.id })}
                    >
                      Разбанить
                    </button>
                  ) : (
                    <button
                      type="button"
                      class="btn dng"
                      onClick={() => setBan({ id: u.id, name: who(u.name, u.username) })}
                    >
                      Бан
                    </button>
                  )}
                  <button
                    type="button"
                    class="btn"
                    onClick={() => void run({ action: "trust", user: u.id, on: !u.trusted })}
                  >
                    {u.trusted ? "Снять статус" : "Доверенный"}
                  </button>
                  <button
                    type="button"
                    class="btn"
                    onClick={() => void run({ action: "purge", user: u.id }, "Удалить все комментарии?")}
                  >
                    Стереть комм.
                  </button>
                  <button
                    type="button"
                    class="btn dng"
                    onClick={() => void run({ action: "deleteUser", user: u.id }, "Удалить аккаунт?")}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p class="muted">Никого не нашли.</p>
      )}
      {ban && (
        <BanDialog
          target={ban}
          onClose={() => setBan(null)}
          onDone={() => {
            setBan(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function Bans({ reloadAll }: { reloadAll: () => void }) {
  const [tick, setTick] = useState(0);
  const data = useApi<{ bans: Ban[]; now: number }>(`/api/admin/community?tab=bans&t=${tick}`);
  if (!data.data) return <p class="muted">{data.error || "Загрузка..."}</p>;
  const { bans, now } = data.data;
  const lift = async (b: Ban) => {
    await post({ action: "unban", user: b.user_id, scope: b.scope });
    setTick((n) => n + 1);
    reloadAll();
  };
  return bans.length ? (
    <ul class="plist">
      {bans.map((b) => {
        const live = !b.lifted && (!b.until || b.until > now);
        return (
          <li class="crow">
            <div class="meta">
              <b>{who(b.name, b.username)}</b>
              <p class="muted">
                <span class={`chip ${live ? "bad" : "mute"}`}>
                  {live ? "действует" : b.lifted ? "снят" : "истёк"}
                </span>{" "}
                {SCOPE[b.scope]} · {when(b.created)} · {b.until ? `до ${when(b.until)}` : "навсегда"}
                {b.reason ? ` · ${b.reason}` : ""}
              </p>
            </div>
            <div class="acts">
              {live && (
                <button type="button" class="btn" onClick={() => void lift(b)}>
                  Снять бан
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  ) : (
    <p class="muted">Блокировок пока нет.</p>
  );
}

function Settings({ initial, reloadAll }: { initial: BlogSettings; reloadAll: () => void }) {
  const [s, setS] = useState<BlogSettings>({ ...DEFAULT_SETTINGS, ...initial });
  const num = (k: keyof BlogSettings, label: string, min: number, max: number) => (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={s[k] as number}
        onInput={(e) => setS({ ...s, [k]: Number((e.target as HTMLInputElement).value) })}
      />
    </label>
  );
  const flag = (k: keyof BlogSettings, label: string) => (
    <label class="inl">
      <input
        type="checkbox"
        checked={!!s[k]}
        onChange={(e) => setS({ ...s, [k]: (e.target as HTMLInputElement).checked })}
      />{" "}
      {label}
    </label>
  );
  return (
    <Card title="Правила сообщества" note="Применяются сразу. Владелец сайта лимитов не имеет.">
      <div class="bf">
        {flag("commentsOpen", "Комментарии включены")}
        {flag("premod", "Первые комментарии новичков идут на проверку")}
        {flag("themesOpen", "Принимать темы от посетителей")}
        {num("slowMode", "Пауза между комментариями, сек", 0, 600)}
        {num("perDay", "Комментариев в день на человека", 1, 500)}
        {num("themesPerDay", "Тем в день на человека", 1, 20)}
      </div>
      <div class="acts bar">
        <span class="sp" />
        <button
          type="button"
          class="btn pri"
          onClick={() => void post({ action: "settings", value: s }, "Сохранено").then(reloadAll)}
        >
          Сохранить
        </button>
      </div>
    </Card>
  );
}

export function Community() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("comments");
  const [tick, setTick] = useState(0);
  const head = useApi<Overview>(`/api/admin/community?t=${tick}`);
  if (!head.data) return <p class="muted">{head.error || "Загрузка..."}</p>;
  const { counts, settings } = head.data;
  const reloadAll = () => setTick((n) => n + 1);
  const badge: Record<string, number> = {
    comments: counts.flagged + counts.pending + counts.reported,
    users: counts.users,
    bans: counts.bans,
  };

  return (
    <>
      <Card
        title="Сообщество блога"
        note="Здесь модерация комментариев, пользователи, блокировки и правила. Подозрительные комментарии сайт прячет за кнопкой «Всё равно показать», а текст не отдаёт, пока посетитель её не нажмёт."
      >
        <p class="muted">
          Возможный спам: <b>{counts.flagged}</b> · на проверке: <b>{counts.pending}</b> · жалобы:{" "}
          <b>{counts.reported}</b> · темы на проверке: <b>{counts.themes}</b>
        </p>
      </Card>
      <div class="tabs main">
        {TABS.map(([id, label]) => (
          <button type="button" class={id === tab ? "on" : ""} onClick={() => setTab(id)}>
            {label}
            {badge[id] ? ` (${badge[id]})` : ""}
          </button>
        ))}
      </div>
      {tab === "comments" && <Comments counts={counts} reloadAll={reloadAll} />}
      {tab === "users" && <Users reloadAll={reloadAll} />}
      {tab === "bans" && <Bans reloadAll={reloadAll} />}
      {tab === "settings" && <Settings initial={settings} reloadAll={reloadAll} />}
    </>
  );
}
