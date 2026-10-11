import foxochat from "../assets/projects/foxochat.webp";
import { t, T } from "./i18n";

// Cards in the "Latest projects" grid. kind: order | personal | team, state: active | done | paused | archive
export const projects = [
  {
    name: "FoxoChat",
    repo: "foxochat-frontend",
    repoUrl: "https://github.com/foxocorp/foxochat-frontend",
    img: foxochat,
    role: t("Второй CEO, фронтенд-разработчик", "Second CEO, frontend developer"),
    details: t(
      "Мессенджер реального времени для веба и десктопа. Я отвечал за фронтенд: интерфейс на Preact и TypeScript, состояние на MobX, десктопная сборка на Tauri. Проект командный, сейчас заморожен.",
      "A realtime messenger for web and desktop. I was responsible for the frontend: the interface in Preact and TypeScript, state in MobX, the desktop build in Tauri. A team project, currently frozen.",
    ),
    href: "https://foxochat.app",
    hue: 265,
    glyph: "F",
    tags: ["Preact", "TypeScript", "MobX", "Tauri"],
    kind: "team",
    state: "paused",
    status: t("Заморожен", "Frozen"),
    desc: t(
      "Мессенджер реального времени для веба и десктопа. Второй CEO и фронтенд-разработчик командного проекта.",
      "A realtime messenger for web and desktop. I'm the second CEO and frontend developer of this team project.",
    ),
  },
  {
    name: "MatrixBot",
    role: t("Автор и разработчик", "Author and developer"),
    details: t(
      "Многофункциональный Discord-бот: команды для развлечений, инструменты модерации и администрирования. На пике бот работал на 4 608 серверах и обработал 270 107 команд (статистика на 23.07.2024). Сейчас бот отключён.",
      "A multi-purpose Discord bot: fun commands plus moderation and administration tools. At its peak it served 4,608 servers and handled 270,107 commands (stats as of 23.07.2024). The bot is switched off now.",
    ),
    href: "https://matrixbot-web.pages.dev/",
    hue: 250,
    glyph: "M",
    tags: ["Node.js", "JavaScript", "MongoDB"],
    kind: "personal",
    state: "paused",
    status: t("Отключён", "Switched off"),
    stats: { servers: 4608, users: 200879, commands: 270107 },
    desc: t(
      "Многофункциональный Discord-бот: от развлечений до инструментов модерации. Статистика на 23.07.2024.",
      "A multi-purpose Discord bot, from fun commands to moderation tools. Stats as of 23.07.2024.",
    ),
  },
  {
    name: "matrixbot-api",
    repo: "matrixbot-api",
    role: t("Автор", "Author"),
    details: t(
      "Серверная часть для моего Discord-бота MatrixBot: API, через которое бот и сайт получают данные.",
      "The server side of my Discord bot MatrixBot: the API that the bot and its site get data from.",
    ),
    href: "https://github.com/SnakOleg/matrixbot-api",
    hue: 200,
    glyph: "{ }",
    tags: ["Node.js", "API"],
    kind: "personal",
    state: "paused",
    desc: t("API для моего Discord-бота MatrixBot.", "API for my Discord bot MatrixBot."),
  },
  {
    name: "Namix",
    repo: "namix-site",
    repoUrl: "https://github.com/SnakOleg/namix-site",
    role: t("Разработка по заказу", "Built for a client"),
    details: t(
      "Сайт для Discord-сообщества, сделан на заказ на Vue и TypeScript.",
      "A website for a Discord community, built for a client with Vue and TypeScript.",
    ),
    href: "https://namix-site.pages.dev/",
    hue: 160,
    glyph: "N",
    tags: ["Vue", "TS"],
    kind: "order",
    state: "done",
    desc: t("Сайт для Discord-сообщества.", "A website for a Discord community."),
  },
  {
    name: "Hotel",
    repo: "hotel",
    repoUrl: "https://github.com/SnakOleg/hotel",
    role: t("Разработка по заказу", "Built for a client"),
    details: t(
      "Сайт для зоны отдыха на Азовском море, сделан на заказ на Nuxt и Vue.",
      "A website for a recreation area on the Sea of Azov, built for a client with Nuxt and Vue.",
    ),
    href: "https://hotel-aql.pages.dev/",
    hue: 30,
    glyph: "H",
    tags: ["Nuxt", "Vue"],
    kind: "order",
    state: "done",
    desc: t("Сайт для зоны отдыха на Азовском море.", "A website for a recreation area on the Sea of Azov."),
  },
  {
    name: "Sandbox",
    repo: "Sandbox",
    repoUrl: "https://github.com/SnakOleg/Sandbox",
    role: t("Автор", "Author"),
    details: t(
      "Репозиторий для практики: в ветках лежат мини-проекты, на которых я тренировал навыки.",
      "A practice repository: its branches hold mini projects where I trained my skills.",
    ),
    href: "https://sandbox-40f.pages.dev",
    hue: 90,
    glyph: "</>",
    tags: ["HTML", "CSS", "JS"],
    kind: "personal",
    state: "active",
    desc: t(
      "Песочница для практики: ветки с мини-проектами, на которых я оттачивал навыки.",
      "A practice sandbox: branches with mini projects where I sharpened my skills.",
    ),
  },
  {
    name: "MatrixBot Python",
    repo: "MatrixBot-python",
    role: t("Автор", "Author"),
    details: t(
      "Первая версия бота, написанная на Python. Сейчас в архиве.",
      "The first version of the bot, written in Python. Archived now.",
    ),
    href: "https://github.com/SnakOleg/MatrixBot-python",
    hue: 55,
    glyph: "Py",
    tags: ["Python"],
    kind: "personal",
    state: "archive",
    status: t("Архив", "Archive"),
    desc: t("Первая версия бота на Python.", "The first version of the bot, in Python."),
  },
] as {
  name: string;
  href: string;
  repo?: string;
  repoUrl?: string;
  hue: number;
  glyph: string;
  tags: string[];
  desc: T;
  details?: T;
  role?: T;
  img?: string;
  status?: T;
  kind: "order" | "personal" | "team";
  state: "active" | "done" | "paused" | "archive";
  stats?: { servers: number; users: number; commands: number };
}[];
