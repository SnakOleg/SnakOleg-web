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
      "Минималистичный мессенджер для общения, вдохновлённый дизайном Telegram и Discord. Сейчас проект отправлен в бэклог неопределённого будущего.",
      "A minimalist messenger inspired by the design of Telegram and Discord. The project now sits in the backlog of an uncertain future.",
    ),
    href: "https://foxochat.app",
    hue: 265,
    glyph: "F",
    tags: ["Preact", "TypeScript", "MobX", "Tauri"],
    kind: "team",
    state: "paused",
    status: t("В бэклоге", "In the backlog"),
    desc: t(
      "Минималистичный мессенджер для общения, вдохновлённый дизайном Telegram и Discord. Сейчас проект отправлен в бэклог неопределённого будущего.",
      "A minimalist messenger inspired by the design of Telegram and Discord. The project now sits in the backlog of an uncertain future.",
    ),
  },
  {
    name: "MatrixBot",
    role: t("Автор и разработчик", "Author and developer"),
    details: t(
      "Многофункциональный Discord-бот, который помогал модерации серверов автоматизировать и ускорить рутину. Кроме модерации, были команды для развлечений и прочего. Сейчас проект завершил свой жизненный цикл. Статистика на 23.07.2024.",
      "A multi-purpose Discord bot that helped server moderators automate and speed up routine work. Besides moderation it had fun commands and more. The project has now reached the end of its life. Stats as of 23.07.2024.",
    ),
    href: "https://matrixbot-web.pages.dev/",
    hue: 250,
    glyph: "M",
    tags: ["Node.js", "JavaScript", "MongoDB"],
    kind: "personal",
    state: "done",
    status: t("Завершён", "Finished"),
    stats: { servers: 4608, users: 200879, commands: 270107 },
    desc: t(
      "Многофункциональный Discord-бот, который помогал модерации серверов автоматизировать и ускорить рутину. Кроме модерации, были команды для развлечений и прочего. Сейчас проект завершил свой жизненный цикл.",
      "A multi-purpose Discord bot that helped server moderators automate and speed up routine work. Besides moderation it had fun commands and more. The project has now reached the end of its life.",
    ),
  },
  {
    name: "matrixbot-api",
    repo: "matrixbot-api",
    role: t("Автор", "Author"),
    details: t(
      "API для моего Discord-бота: через него бот работал с базой данных, а ещё отправлял статистику в Grafana и на свой сайт.",
      "The API for my Discord bot: through it the bot talked to the database and sent its stats to Grafana and to its website.",
    ),
    href: "https://github.com/SnakOleg/matrixbot-api",
    hue: 200,
    glyph: "{ }",
    tags: ["Node.js", "API"],
    kind: "personal",
    state: "paused",
    desc: t(
      "API для моего Discord-бота: через него бот работал с базой данных, а ещё отправлял статистику в Grafana и на свой сайт.",
      "The API for my Discord bot: through it the bot talked to the database and sent its stats to Grafana and to its website.",
    ),
  },
  {
    name: "Namix",
    repo: "namix-site",
    repoUrl: "https://github.com/SnakOleg/namix-site",
    role: t("Разработка по заказу", "Built for a client"),
    details: t(
      "Небольшой заказной сайт по готовому дизайну для Discord-сообщества.",
      "A small client site for a Discord community, built from a ready design.",
    ),
    href: "https://namix-site.pages.dev/",
    hue: 160,
    glyph: "N",
    tags: ["Vue", "TS"],
    kind: "order",
    state: "done",
    desc: t(
      "Небольшой заказной сайт по готовому дизайну для Discord-сообщества.",
      "A small client site for a Discord community, built from a ready design.",
    ),
  },
  {
    name: "Hotel",
    repo: "hotel",
    repoUrl: "https://github.com/SnakOleg/hotel",
    role: t("Разработка по заказу", "Built for a client"),
    details: t(
      "Заказной сайт для базы отдыха на Азовском море.",
      "A client site for a holiday resort on the Sea of Azov.",
    ),
    href: "https://hotel-aql.pages.dev/",
    hue: 30,
    glyph: "H",
    tags: ["Nuxt", "Vue"],
    kind: "order",
    state: "done",
    desc: t(
      "Заказной сайт для базы отдыха на Азовском море.",
      "A client site for a holiday resort on the Sea of Azov.",
    ),
  },
  {
    name: "Sandbox",
    repo: "Sandbox",
    repoUrl: "https://github.com/SnakOleg/Sandbox",
    role: t("Автор", "Author"),
    details: t(
      "Песочница для практики: иногда я выплёскиваю сюда фантазию и практикую навыки.",
      "A practice sandbox where I sometimes let my imagination out and train my skills.",
    ),
    href: "https://sandbox-40f.pages.dev",
    hue: 90,
    glyph: "</>",
    tags: ["HTML", "CSS", "JS"],
    kind: "personal",
    state: "active",
    desc: t(
      "Песочница для практики: иногда я выплёскиваю сюда фантазию и практикую навыки.",
      "A practice sandbox where I sometimes let my imagination out and train my skills.",
    ),
  },
  {
    name: "MatrixBot Python",
    repo: "MatrixBot-python",
    role: t("Автор", "Author"),
    details: t(
      "Самая первая версия моего Discord-бота, написанная на Python.",
      "The very first version of my Discord bot, written in Python.",
    ),
    href: "https://github.com/SnakOleg/MatrixBot-python",
    hue: 55,
    glyph: "Py",
    tags: ["Python"],
    kind: "personal",
    state: "archive",
    status: t("Архив", "Archive"),
    desc: t(
      "Самая первая версия моего Discord-бота, написанная на Python.",
      "The very first version of my Discord bot, written in Python.",
    ),
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
