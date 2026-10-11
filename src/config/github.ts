import { t, T } from "./i18n";

export type RepoRule = {
  group: string;
  title?: string | T;
  desc?: T;
  tags?: string[];
  date?: string;
  private?: boolean;
};

// The timeline is built from your GitHub. Add/remove repos in `repos` to choose what is shown.
export const github = {
  user: "SnakOleg",
  live: true, // in the browser refresh hashes/dates from api.github.com (falls back to src/data/github.json)
  mode: "allowlist" as "allowlist" | "auto", // "auto" also shows every new public non-fork repo
  hide: ["SnakOleg", "github-readme-stats"] as string[], // skipped in "auto" mode
  totals: { repos: 22 }, // repositories on the profile, private ones included (typed by hand)
  lanes: { bots: 0, web: 1 } as Record<string, number>, // group -> branch lane (0 = main)
  // key = repo name. For a private repo add `private: true, date: "YYYY-MM-DD"` (shown with a lock, no link).
  repos: {
    "MatrixBot-python": {
      group: "bots",
      title: "MatrixBot (Python)",
      desc: t("Первый Discord-бот на Python.", "My first Discord bot, written in Python."),
      tags: ["Python"],
    },
    "MatrixBot-web-beta": {
      group: "bots",
      title: t("Сайт MatrixBot (beta)", "MatrixBot site (beta)"),
      desc: t("Первый сайт для бота.", "The first website for the bot."),
      tags: ["HTML"],
    },
    "matrixbot-api": {
      group: "bots",
      title: "matrixbot-api",
      desc: t("API для моего Discord-бота MatrixBot.", "API for my Discord bot MatrixBot."),
      tags: ["Node.js"],
    },
    hotel: {
      group: "web",
      title: "Hotel",
      desc: t(
        "Сайт для зоны отдыха на Азовском море (заказ).",
        "Website for a recreation area on the Sea of Azov (client work).",
      ),
      tags: ["Nuxt", "Vue"],
    },
    "foxochat-frontend": {
      group: "web",
      title: "FoxoChat",
      desc: t(
        "Фронтенд мессенджера, большая часть коммитов моя. Проект заморожен.",
        "Frontend of a messenger, most of the commits are mine. The project is frozen.",
      ),
      tags: ["Preact", "TypeScript"],
    },
    "SnakOleg-web": {
      group: "web",
      title: t("Это портфолио", "This portfolio"),
      desc: t("Первая версия сайта-визитки.", "The first version of this business-card site."),
      tags: ["TypeScript"],
    },
    Sandbox: {
      group: "web",
      title: "Sandbox",
      desc: t("Практика: ветки с мини-проектами.", "Practice: branches with mini projects."),
      tags: ["SCSS"],
    },
    "namix-site": {
      group: "web",
      title: "Namix",
      desc: t("Сайт для Discord-сообщества (заказ).", "Website for a Discord community (client work)."),
      tags: ["Vue", "TS"],
    },
  } as Record<string, RepoRule>,
  // Manual milestones that are not repos.
  events: [
    {
      date: "2024-07-23",
      group: "bots",
      title: t("Пик MatrixBot", "MatrixBot peak"),
      desc: t("4 608 серверов и 270 107 обработанных команд.", "4,608 servers and 270,107 commands handled."),
      ref: "23.07.2024",
    },
  ] as { date: string; group: string; title: T; desc: T; ref?: string }[],
};
