import { t, T } from "./i18n";

export const profile = {
  name: t("Снак", "Snak"),
  nick: "Snak / Oleg",
  wordmark: "SnakOleg",
  avatar: "", // e.g. "/avatar.webp" (file in /public). Empty = placeholder cat
  theme: { hue: 255, mode: "auto" as "auto" | "light" | "dark", presets: true },
  hi: t("Привет, я", "Hi, I'm"),
  roles: [
    t("Full-Stack разработчик", "Full-Stack developer"),
    t("TypeScript и Preact", "TypeScript & Preact"),
    t("Автоматизирую рутину", "Automating the boring stuff"),
  ],
  about: t(
    "Я Олег, в интернете чаще известен как Снак. Делаю интерфейсы и всё, что за ними: люблю разбираться в архитектуре, автоматизировать рутину и превращать идею в работающий продукт.",
    "I'm Oleg, better known online as Snak. I build interfaces and everything behind them: I like digging into architecture, automating routine work and turning an idea into a working product.",
  ),
  waka: {
    url: "https://wakatime.com/@snakoleg",
    text: t("Просидел более 500 часов в IDE", "Over 500 hours in the IDE"),
  },
  contacts: [
    { icon: "telegram", label: "@The_Nikeri", href: "https://t.me/the_nikeri", copy: "@The_Nikeri" },
    { icon: "telegram", label: t("Мой ТГК", "My TG channel"), href: "https://t.me/SnakOleg" },
    { icon: "github", label: "GitHub", href: "https://github.com/SnakOleg" },
    { icon: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/snakoleg/" },
    { icon: "instagram", label: "Instagram", href: "https://instagram.com/chonkia12" },
    { icon: "briefcase", label: t("Рабочий ТГ", "Work TG"), href: "https://t.me/Foiler993" },
  ] as { icon: string; label: string | T; href: string; copy?: string }[],
  hard: [
    {
      group: "Frontend",
      items: ["TypeScript", "React", "Preact", "Vue", "Nuxt", "Vite", "MobX", "Sass", "Vuetify", "Bootstrap"],
    },
    { group: "Backend", items: ["Node.js", "MongoDB", "MySQL", "Discord API"] },
    { group: "DevOps", items: ["Linux", "Ubuntu", "Git", "Docker", "Cloudflare", "Grafana"] },
    { group: t("Дизайн", "Design"), items: ["Figma", "Photoshop"] },
  ] as { group: string | T; items: string[] }[],
  soft: [
    t("Ответственность", "Responsibility"),
    t("Координация команды", "Team coordination"),
    t("Решение проблем", "Problem solving"),
    t("Самообучение", "Self-learning"),
    t("Автоматизация рутины", "Routine automation"),
    t("Внимание к архитектуре", "Architecture mindset"),
    t("Работа с заказчиками", "Working with clients"),
  ],
};
