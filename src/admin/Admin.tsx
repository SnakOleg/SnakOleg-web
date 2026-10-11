import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Ico } from "../components/ui/Icon";
import { DEMO, api } from "./api";
import { exportAll } from "./backup";
import { requestSection } from "./bus";
import { Dialogs } from "./dialogs";
import { isDirty, leave, setGuard } from "./guard";
import { Analytics } from "./pages/Analytics";
import { Content } from "./pages/Content";
import { Overview } from "./pages/Overview";
import { Blog } from "./pages/Blog";
import { Community } from "./pages/Community";
import { Presets } from "./pages/Presets";
import { Security } from "./pages/Security";
import { Palette } from "./Palette";
import type { Command } from "./Palette";
import { SECTIONS } from "./schema";

const PAGES = [
  { id: "overview", label: "Обзор", icon: "overview", Page: Overview },
  { id: "analytics", label: "Аналитика", icon: "analytics", Page: Analytics },
  { id: "content", label: "Контент", icon: "content", Page: Content },
  { id: "presets", label: "Темы", icon: "palette", Page: Presets },
  { id: "blog", label: "Блог", icon: "blog", Page: Blog },
  { id: "community", label: "Сообщество", icon: "community", Page: Community },
  { id: "security", label: "Безопасность", icon: "shield", Page: Security },
] as const;

type PageId = (typeof PAGES)[number]["id"];

const route = (): PageId => PAGES.find((p) => p.id === location.hash.slice(2))?.id ?? "overview";

function Login() {
  return (
    <div class="login">
      <div class="card">
        <div class="logo">S</div>
        <h1>Панель управления</h1>
        <p class="muted">Вход только для владельца сайта.</p>
        <a class="btn pri big" href="/api/auth/login">
          Войти через Telegram
        </a>
      </div>
    </div>
  );
}

export function Admin() {
  const [me, setMe] = useState<{ name: string } | null | false>(null);
  const [page, setPage] = useState<PageId>(route);
  const [palette, setPalette] = useState(false);
  const current = useRef(page);
  const reverting = useRef(false);
  current.current = page;

  useEffect(() => {
    api<{ name: string }>("/api/auth/me").then(setMe, () => setMe(false));
  }, []);

  const go = async (id: PageId) => {
    if (id === current.current) return;
    if (await leave()) location.hash = `#/${id}`;
  };

  useEffect(() => {
    const onHash = () => {
      if (reverting.current) {
        reverting.current = false;
        return;
      }
      const target = route();
      if (!isDirty()) {
        setPage(target);
        return;
      }
      reverting.current = true;
      location.hash = `#/${current.current}`;
      void leave().then((ok) => {
        if (ok) location.hash = `#/${target}`;
      });
    };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((open) => !open);
      }
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      setGuard({ dirty: false, save: null });
    };
  }, []);

  const commands = useMemo<Command[]>(
    () => [
      ...PAGES.map((p) => ({ id: p.id, label: p.label, hint: "Раздел админки", run: () => go(p.id) })),
      ...SECTIONS.map((s) => ({
        id: `content-${s.id}`,
        label: `Контент: ${s.title}`,
        hint: s.hint,
        run: async () => {
          await go("content");
          requestSection(s.id);
        },
      })),
      {
        id: "site",
        label: "Открыть сайт",
        hint: "В новой вкладке",
        run: () => void window.open("/", "_blank"),
      },
      {
        id: "backup",
        label: "Скачать резервную копию",
        hint: "JSON со всем контентом",
        run: () => exportAll(),
      },
    ],
    [],
  );

  if (me === null) return <div class="boot">...</div>;
  if (me === false) return <Login />;

  const active = PAGES.find((p) => p.id === page)!;
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST", body: {} }).catch(() => undefined);
    location.reload();
  };

  return (
    <div class="shell">
      <aside class="side" aria-label="Админка">
        <div class="brand">
          <span class="logo">S</span>
          <b>Snak / Oleg</b>
          <small>admin</small>
        </div>
        <nav aria-label="Разделы">
          {PAGES.map((p) => (
            <a
              href={`#/${p.id}`}
              class={p.id === page ? "on" : ""}
              onClick={(e) => {
                e.preventDefault();
                void go(p.id);
              }}
            >
              <Ico n={p.icon} />
              <span class="lb">{p.label}</span>
            </a>
          ))}
        </nav>
        <a class="site" href="/" target="_blank" rel="noopener">
          Открыть сайт
        </a>
      </aside>
      <div class="main">
        <header class="top">
          <h1>{active.label}</h1>
          <span class="sp" />
          {DEMO && <span class="chip warn">демо-данные</span>}
          <button type="button" class="btn find" onClick={() => setPalette(true)}>
            Поиск <kbd>Ctrl K</kbd>
          </button>
          <span class="who">{me.name}</span>
          <button type="button" class="btn" onClick={() => void logout()}>
            Выйти
          </button>
        </header>
        <main class="page">
          <active.Page key={page} />
        </main>
      </div>
      {palette && <Palette commands={commands} onClose={() => setPalette(false)} />}
      <Dialogs />
    </div>
  );
}
