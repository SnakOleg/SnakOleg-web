import { useState } from "preact/hooks";
import { api } from "../api";
import { toast } from "../dialogs";

export type BanTarget = { id: string; name: string; scope?: "blog" | "themes" | "all"; purge?: boolean };

const SCOPES = [
  ["blog", "Блог (комментарии и реакции)"],
  ["themes", "Предложение тем"],
  ["all", "Всё сразу"],
] as const;
const TERMS = [
  ["1", "1 день"],
  ["7", "7 дней"],
  ["30", "30 дней"],
  ["0", "Навсегда"],
] as const;

export function BanDialog({
  target,
  onClose,
  onDone,
}: {
  target: BanTarget;
  onClose: () => void;
  onDone: () => void;
}) {
  const [scope, setScope] = useState(target.scope ?? "blog");
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  const [purge, setPurge] = useState(!!target.purge);
  const [busy, setBusy] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/community", {
        method: "POST",
        body: { action: "ban", user: target.id, scope, days: Number(days) || null, reason, purge },
      });
      toast("Пользователь заблокирован");
      onDone();
    } catch (err) {
      toast((err as Error).message, "error");
      setBusy(false);
    }
  };

  return (
    <div
      class="banback"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form class="card bandlg" aria-label="Блокировка" onSubmit={(e) => void submit(e)}>
        <h2>Заблокировать: {target.name}</h2>
        <label>
          Где
          <select
            value={scope}
            onChange={(e) => setScope((e.target as HTMLSelectElement).value as typeof scope)}
          >
            {SCOPES.map(([v, l]) => (
              <option value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          На сколько
          <select value={days} onChange={(e) => setDays((e.target as HTMLSelectElement).value)}>
            {TERMS.map(([v, l]) => (
              <option value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Причина (увидит пользователь)
          <input
            value={reason}
            maxLength={200}
            onInput={(e) => setReason((e.target as HTMLInputElement).value)}
            placeholder="Спам, реклама, оскорбления..."
          />
        </label>
        <label class="inl">
          <input
            type="checkbox"
            checked={purge}
            onChange={(e) => setPurge((e.target as HTMLInputElement).checked)}
          />{" "}
          Удалить все его комментарии
        </label>
        <p class="muted">Пользователь увидит сообщение о блокировке и контакт для связи с вами.</p>
        <div class="acts">
          <button type="button" class="btn" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" class="btn dng" disabled={busy}>
            Заблокировать
          </button>
        </div>
      </form>
    </div>
  );
}
