import { useState } from "preact/hooks";
import { site } from "../config";
import { api } from "./api";
import { toast } from "./dialogs";
import { Card } from "./ui";

type Result = { url: string; status: number; ms: number; note?: string };
type Item = { label: string; url: string };

// Sites that block automated requests answer with these codes, so they are shown as "cannot verify".
const LIMITED = new Set([401, 403, 405, 429, 999]);

const text = (v: unknown) => (typeof v === "string" ? v : ((v as { ru?: string })?.ru ?? ""));

async function gather(): Promise<Item[]> {
  let saved: Record<string, any> = {};
  try {
    const res = await fetch("/api/content");
    if (res.ok && (res.headers.get("content-type") ?? "").includes("json")) saved = await res.json();
  } catch {
    // offline or demo: the defaults are used
  }
  const contacts = saved.contacts ?? site.contacts;
  const projects = saved.projects ?? site.projects;
  const waka = saved.profile?.waka ?? site.waka;

  const items: Item[] = [{ label: "WakaTime", url: waka.url }];
  for (const c of contacts) items.push({ label: text(c.label), url: c.href });
  for (const p of projects) {
    items.push({ label: p.name, url: p.href });
    if (p.repoUrl) items.push({ label: `${p.name} (GitHub)`, url: p.repoUrl });
  }
  const seen = new Set<string>();
  return items.filter((i) => /^https?:/.test(i.url) && !seen.has(i.url) && seen.add(i.url));
}

const tone = (r: Result) =>
  r.status >= 200 && r.status < 400 ? "ok" : LIMITED.has(r.status) ? "warn" : "bad";
const label = (r: Result) =>
  r.status >= 200 && r.status < 400
    ? `${r.status}, ${r.ms} мс`
    : LIMITED.has(r.status)
      ? `не проверить (${r.status})`
      : (r.note ?? `ошибка ${r.status}`);

export function LinkCheck() {
  const [items, setItems] = useState<Item[]>([]);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const list = await gather();
      setItems(list);
      const reply = await api<{ results: Result[] }>("/api/admin/links", {
        method: "POST",
        body: { urls: list.map((i) => i.url) },
      });
      setResults(Object.fromEntries(reply.results.map((r) => [r.url, r])));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const broken = Object.values(results).filter((r) => tone(r) === "bad").length;

  return (
    <Card
      title="Проверка ссылок"
      note="Сервер открывает каждую ссылку сайта и смотрит, отвечает ли она. Часть сайтов (например, LinkedIn) не пускает автоматические запросы, для них показано «не проверить», это не ошибка."
      actions={
        <button type="button" class="btn" disabled={busy} onClick={() => void run()}>
          {busy ? "Проверяю..." : "Проверить сейчас"}
        </button>
      }
    >
      {!items.length ? (
        <p class="muted">Нажмите «Проверить сейчас», чтобы убедиться, что ссылки на сайте живые.</p>
      ) : (
        <>
          {Object.keys(results).length > 0 && (
            <p class={broken ? "muted" : "muted ok-text"}>
              {broken ? `Не отвечают: ${broken}` : "Все проверенные ссылки отвечают"}
            </p>
          )}
          <ul class="links">
            {items.map((i) => {
              const r = results[i.url];
              return (
                <li>
                  <span>{i.label}</span>
                  <code title={i.url}>{i.url.replace(/^https?:\/\/(www\.)?/, "")}</code>
                  {r ? (
                    <span class={`chip ${tone(r)}`}>{label(r)}</span>
                  ) : (
                    <span class="chip">{busy ? "..." : "-"}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
