import { t, T } from "./i18n";

export const profile = {
  name: t("Снак", "Snak"),
  nick: "Snak / Oleg",
  wordmark: "SnakOleg",
  avatar: "", // e.g. "/avatar.webp" (file in /public). Empty = placeholder cat
  theme: { hue: 255, mode: "auto" as "auto" | "light" | "dark", presets: true },
  hi: t("Привет, я", "Hi, I'm"),
  roles: [t("Full-Stack разработчик", "Full-Stack developer")],
  about: t(
    "Меня зовут Олег, начинающий фулстакер. Люблю разбираться в деталях, а ещё, помимо программирования, увлекаюсь дизайном и монтажом.",
    "I'm Oleg, a beginner full-stack developer. I like digging into details, and besides programming I'm into design and video editing.",
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
    t("Самообучение", "Self-learning"),
    t("Работа с B2B-клиентами", "Working with B2B clients"),
    t("Внимательность", "Attention to detail"),
    t("ИИ как инструмент", "AI as a tool"),
  ],
};
