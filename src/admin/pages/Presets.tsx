import { useState } from "preact/hooks";
import { KEYS_ORDER, Swatch } from "../Swatch";
import { validatePalette } from "../../../shared/palette";
import type { Palette } from "../../../shared/palette";
import { api, when } from "../api";
import { confirmAction, toast } from "../dialogs";
import { Card } from "../ui";
import { BanDialog } from "./BanDialog";
import { useApi } from "../useApi";

type Preset = {
  id: number;
  name: string;
  author: string;
  comment: string;
  palette: Palette;
  status: "pending" | "approved" | "rejected";
  created: number;
  user_id?: string | null;
  uname?: string | null;
  username?: string | null;
  banned?: number;
};
type Reply = {
  presets: Preset[];
  accepting: boolean;
  limits: { pending: number; total: number; perHour: number };
};

const TABS = [
  ["pending", "На проверке"],
  ["approved", "Одобрены"],
  ["rejected", "Отклонены"],
] as const;

const WARN: Record<string, string> = {
  colors: "некорректные цвета",
  text: "низкий контраст текста",
  muted: "низкий контраст второстепенного текста",
  accent: "низкий контраст акцента",
};

function Row({ p, reload }: { p: Preset; reload: () => void }) {
  const [form, setForm] = useState({ name: p.name, author: p.author, comment: p.comment });
  const [ban, setBan] = useState(false);
  const problem = validatePalette(p.palette);

  const run = async (action: string, ask?: { title: string; text: string; ok: string }) => {
    if (ask && !(await confirmAction({ ...ask, tone: "danger" }))) return;
    try {
      await api("/api/admin/presets", { method: "POST", body: { action, id: p.id, ...form } });
      toast(action === "approve" ? "Тема одобрена и появится на сайте в течение пяти минут" : "Готово");
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <li class="prow">
      <div class="demo" style={Object.fromEntries(KEYS_ORDER.map((k) => [`--p-${k}`, p.palette[k]]))}>
        <b>Пример текста</b>
        <span>Второстепенный текст</span>
        <i>Кнопка</i>
      </div>
      <div class="meta">
        <Swatch palette={p.palette} />
        <div class="fields">
          <input
            aria-label="Название"
            value={form.name}
            maxLength={30}
            onInput={(e) => setForm({ ...form, name: (e.target as HTMLInputElement).value })}
          />
          <input
            aria-label="Автор"
            value={form.author}
            maxLength={30}
            onInput={(e) => setForm({ ...form, author: (e.target as HTMLInputElement).value })}
          />
          <input
            aria-label="Комментарий"
            value={form.comment}
            maxLength={140}
            onInput={(e) => setForm({ ...form, comment: (e.target as HTMLInputElement).value })}
          />
        </div>
        <p class="muted">
          {when(p.created)}
          {p.user_id && (
            <span>
              {" "}
              · Telegram: {p.uname || "нет"}
              {p.username ? ` @${p.username}` : ""}
              {p.banned ? <span class="chip bad"> в бане</span> : null}
            </span>
          )}
          {problem && <span class="chip warn"> {WARN[problem]}</span>}
        </p>
      </div>
      <div class="acts">
        {p.status !== "approved" && (
          <button type="button" class="btn pri" onClick={() => void run("approve")}>
            Одобрить
          </button>
        )}
        {p.status === "approved" && (
          <button type="button" class="btn" onClick={() => void run("update")}>
            Сохранить текст
          </button>
        )}
        {p.status === "pending" && (
          <button type="button" class="btn" onClick={() => void run("reject")}>
            Отклонить
          </button>
        )}
        {p.user_id && !p.banned && (
          <button type="button" class="btn dng" onClick={() => setBan(true)}>
            Заблокировать автора
          </button>
        )}
        <button
          type="button"
          class="btn dng"
          onClick={() =>
            void run("delete", { title: "Удалить тему?", text: "Она пропадёт безвозвратно.", ok: "Удалить" })
          }
        >
          Удалить
        </button>
      </div>
      {ban && p.user_id && (
        <BanDialog
          target={{ id: p.user_id, name: p.uname || p.author, scope: "themes" }}
          onClose={() => setBan(false)}
          onDone={() => {
            setBan(false);
            reload();
          }}
        />
      )}
    </li>
  );
}

export function Presets() {
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("pending");
  const data = useApi<Reply>(`/api/admin/presets?t=${tick}`);
  const reload = () => setTick((n) => n + 1);

  if (!data.data) return <p class="muted">{data.error || "Загрузка..."}</p>;
  const { presets, accepting, limits } = data.data;
  const count = (s: string) => presets.filter((p) => p.status === s).length;
  const list = presets.filter((p) => p.status === tab);

  return (
    <>
      <Card
        title="Темы от посетителей"
        note="Посетители собирают свою палитру в окне настроек сайта и могут предложить её. Здесь вы проверяете тему, при желании правите название, автора и комментарий, и одобряете. Одобренные темы видны всем с подписью автора. Приём предложений включается в разделе Контент, Оформление."
      >
        <p class="muted">
          Приём предложений: <b>{accepting ? "включён" : "выключен"}</b>. Лимиты: до {limits.pending} тем на
          проверке, до {limits.total} всего, не больше {limits.perHour} предложений в час с одного адреса.
          Отклонённые темы удаляются через неделю.
        </p>
      </Card>

      <div class="tabs main">
        {TABS.map(([id, label]) => (
          <button type="button" class={id === tab ? "on" : ""} onClick={() => setTab(id)}>
            {label} ({count(id)})
          </button>
        ))}
      </div>

      {list.length ? (
        <ul class="plist">
          {list.map((p) => (
            <Row key={`${p.id}-${tick}`} p={p} reload={reload} />
          ))}
        </ul>
      ) : (
        <p class="muted">Здесь пока ничего нет.</p>
      )}
    </>
  );
}
