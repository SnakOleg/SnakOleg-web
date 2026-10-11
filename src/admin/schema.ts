import { site } from "../config";

export type F = {
  k?: string;
  l?: string;
  ph?: string;
  opts?: string[];
  fields?: F[];
  of?: F;
  sum?: (v: any) => string;
  t: "text" | "area" | "i18n" | "i18na" | "tags" | "num" | "bool" | "select" | "list" | "obj";
};
type Section = {
  id: string;
  title: string;
  hint: string;
  root: F;
  defaults: () => any;
  toForm?: (v: any) => any;
  fromForm?: (v: any) => any;
};

const f = (k: string, l: string, t: F["t"], x: Partial<F> = {}): F => ({ k, l, t, ...x });
const tT = (v: any) => (typeof v === "string" ? { ru: v, en: v } : (v ?? { ru: "", en: "" }));
const label = (v: any) => (typeof v === "string" ? v : v?.ru || v?.en || "");
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const ICONS = ["telegram", "github", "linkedin", "instagram", "briefcase", "clock", "code", "link"];

export function defaultOf(x: F): any {
  switch (x.t) {
    case "i18n":
    case "i18na":
      return { ru: "", en: "" };
    case "tags":
    case "list":
      return [];
    case "num":
      return 0;
    case "bool":
      return false;
    case "select":
      return x.opts![0];
    case "obj":
      return Object.fromEntries(x.fields!.map((c) => [c.k, defaultOf(c)]));
    default:
      return "";
  }
}

const ghForm = (g: any) => ({
  mode: g.mode,
  hide: g.hide,
  totals: g.totals,
  groups: Object.entries(g.lanes).map(([name, lane]) => ({ name, lane })),
  repos: Object.entries(g.repos as Record<string, any>).map(([name, r]) => ({
    name,
    group: r.group,
    title: tT(r.title ?? name),
    desc: tT(r.desc ?? ""),
    tags: r.tags ?? [],
    date: r.date ?? "",
    private: !!r.private,
  })),
  events: g.events,
});
const ghSave = (x: any) => ({
  mode: x.mode,
  hide: x.hide,
  totals: x.totals,
  lanes: Object.fromEntries(x.groups.map((g: any) => [g.name, Number(g.lane)])),
  repos: Object.fromEntries(
    x.repos
      .filter((r: any) => r.name)
      .map((r: any) => [
        r.name,
        {
          group: r.group,
          title: r.title,
          desc: r.desc,
          tags: r.tags,
          ...(r.date ? { date: r.date } : {}),
          ...(r.private ? { private: true } : {}),
        },
      ]),
  ),
  events: x.events,
});

export const SECTIONS: Section[] = [
  {
    id: "profile",
    title: "Профиль",
    hint: "Имя, подпись, «Обо мне», аватар, ссылка WakaTime",
    defaults: () =>
      clone({
        name: site.name,
        hi: site.hi,
        about: site.about,
        roles: site.roles,
        avatar: site.avatar,
        wordmark: site.wordmark,
        waka: site.waka,
      }),
    root: {
      t: "obj",
      fields: [
        f("name", "Имя", "i18n"),
        f("hi", "Приветствие", "i18n"),
        f("about", "Обо мне", "i18na"),
        f("roles", "Бегущая строка", "list", { of: { t: "i18n" } }),
        f("avatar", "Аватар (URL или /avatar.webp)", "text"),
        f("wordmark", "Надпись в футере", "text"),
        f("waka", "WakaTime", "obj", { fields: [f("text", "Текст", "i18n"), f("url", "Ссылка", "text")] }),
      ],
    },
  },
  {
    id: "contacts",
    title: "Контакты",
    hint: "Пилюли под приветствием",
    defaults: () => clone(site.contacts),
    root: {
      t: "list",
      sum: (v) => label(v.label),
      of: {
        t: "obj",
        fields: [
          f("icon", "Иконка", "select", { opts: ICONS }),
          f("label", "Подпись", "i18n"),
          f("href", "Ссылка", "text"),
          f("copy", "Текст для кнопки копирования (необязательно)", "text"),
        ],
      },
    },
  },
  {
    id: "skills",
    title: "Навыки",
    hint: "Hard skills по группам и soft skills",
    defaults: () => clone({ hard: site.hard, soft: site.soft }),
    root: {
      t: "obj",
      fields: [
        f("hard", "Hard skills", "list", {
          sum: (v) => label(v.group),
          of: {
            t: "obj",
            fields: [f("group", "Группа", "i18n"), f("items", "Навыки (через запятую)", "tags")],
          },
        }),
        f("soft", "Soft skills", "list", { of: { t: "i18n" } }),
      ],
    },
  },
  {
    id: "projects",
    title: "Проекты",
    hint: "Карточки проектов, тип, статус, описания",
    defaults: () => clone(site.projects),
    root: {
      t: "list",
      sum: (v) => `${v.name} · ${v.kind}/${v.state}`,
      of: {
        t: "obj",
        fields: [
          f("name", "Название", "text"),
          f("repo", "Репозиторий GitHub (для даты и хеша)", "text"),
          f("href", "Ссылка", "text"),
          f("kind", "Тип", "select", { opts: ["order", "personal", "team"] }),
          f("state", "Статус", "select", { opts: ["active", "done", "paused", "archive"] }),
          f("status", "Своя подпись статуса", "i18n"),
          f("desc", "Описание", "i18na"),
          f("tags", "Технологии", "tags"),
          f("hue", "Оттенок баннера (0-360)", "num"),
          f("glyph", "Символ на баннере", "text"),
          f("img", "Картинка баннера (URL)", "text"),
          f("role", "Моя роль", "i18n"),
          f("details", "Подробное описание для окна проекта", "i18na"),
          f("repo", "Имя репозитория GitHub (для цифр в окне)", "text"),
          f("repoUrl", "Ссылка на репозиторий", "text"),
        ],
      },
    },
  },
  {
    id: "uses",
    title: "Мой стек",
    hint: "Устройства, ПК, периферия и программы для страницы /uses",
    defaults: () => clone(site.uses),
    root: {
      t: "list",
      sum: (v) => label(v.title),
      of: {
        t: "obj",
        fields: [
          f("id", "Идентификатор (латиницей, без пробелов)", "text"),
          f("kind", "Вид окна", "select", {
            opts: ["laptop", "phone", "watch", "pc", "monitor", "keyboard", "mouse", "mic", "apps"],
          }),
          f("title", "Заголовок окна", "i18n"),
          f("name", "Название", "i18n"),
          f("sub", "Подзаголовок", "i18n"),
          f("ram", "Память, ГБ (для счётчика наверху, необязательно)", "num"),
          f("storage", "Накопитель, ГБ (для счётчика, необязательно)", "num"),
          f("hz", "Частота экрана, Гц (необязательно)", "num"),
          f("rows", "Характеристики", "list", {
            sum: (v) => label(v.label),
            of: { t: "obj", fields: [f("label", "Название", "i18n"), f("value", "Значение", "i18n")] },
          }),
          f("apps", "Программы (для вида apps)", "list", {
            sum: (v) => v.name,
            of: {
              t: "obj",
              fields: [
                f("name", "Название", "text"),
                f("abbr", "Сокращение (2 буквы)", "text"),
                f("hue", "Оттенок значка (0-360)", "num"),
                f("note", "Подпись", "i18n"),
              ],
            },
          }),
        ],
      },
    },
  },
  {
    id: "announce",
    title: "Объявления",
    hint: "Бегущая строка, полоса вверху или окно по центру. Показывается, пока включено и попадает в даты",
    defaults: () => clone(site.announce),
    root: {
      t: "list",
      sum: (v) => (v.on ? "● " : "○ ") + label(v.text),
      of: {
        t: "obj",
        fields: [
          f("on", "Показывать", "bool"),
          f("style", "Вид (ticker - бегущая строка, banner - полоса, modal - окно по центру)", "select", {
            opts: ["ticker", "banner", "modal"],
          }),
          f("tone", "Цвет (info, warn - жёлтый, ok - зелёный)", "select", { opts: ["info", "warn", "ok"] }),
          f("text", "Текст", "i18n"),
          f("href", "Ссылка (необязательно)", "text"),
          f("label", "Подпись ссылки", "i18n"),
          f("from", "Показывать с (2026-11-01 или 2026-11-01T18:00)", "text"),
          f("to", "Показывать до", "text"),
        ],
      },
    },
  },
  {
    id: "github",
    title: "Таймлайн (GitHub)",
    hint: "Какие репозитории и события показывать, ветки, приватные проекты",
    defaults: () => ghForm(clone(site.github)),
    toForm: ghForm,
    fromForm: ghSave,
    root: {
      t: "obj",
      fields: [
        f("mode", "Режим", "select", { opts: ["allowlist", "auto"] }),
        f("hide", "Скрывать в режиме auto", "tags"),
        f("totals", "Цифры вручную", "obj", {
          fields: [f("repos", "Репозиториев в профиле (с приватными)", "num")],
        }),
        f("groups", "Ветки (группа → линия)", "list", {
          sum: (v) => `${v.name} → ${v.lane}`,
          of: { t: "obj", fields: [f("name", "Группа", "text"), f("lane", "Линия (0 = main)", "num")] },
        }),
        f("repos", "Репозитории", "list", {
          sum: (v) => `${v.name} · ${v.group}${v.private ? " · 🔒" : ""}`,
          of: {
            t: "obj",
            fields: [
              f("name", "Имя репозитория", "text"),
              f("group", "Группа", "text"),
              f("title", "Заголовок", "i18n"),
              f("desc", "Описание", "i18n"),
              f("tags", "Теги", "tags"),
              f("date", "Дата (для приватных, ГГГГ-ММ-ДД)", "text"),
              f("private", "Приватный (без ссылки)", "bool"),
            ],
          },
        }),
        f("events", "События вручную", "list", {
          sum: (v) => `${v.date} · ${label(v.title)}`,
          of: {
            t: "obj",
            fields: [
              f("date", "Дата", "text"),
              f("group", "Группа", "text"),
              f("title", "Заголовок", "i18n"),
              f("desc", "Описание", "i18n"),
              f("ref", "Метка", "text"),
            ],
          },
        }),
      ],
    },
  },
  {
    id: "theme",
    title: "Оформление",
    hint: "Тема и акцентный цвет по умолчанию",
    defaults: () => clone(site.theme),
    root: {
      t: "obj",
      fields: [
        f("hue", "Оттенок акцента (0-360)", "num"),
        f("presets", "Принимать темы от посетителей", "bool"),
        f("mode", "Тема", "select", { opts: ["auto", "light", "dark"] }),
      ],
    },
  },
];
