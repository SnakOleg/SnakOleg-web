import type { L } from "../lib/i18n";

const ru = {
  online: "онлайн",
  label: (n: number) => `Сейчас на сайте: ${n}`,
  cursors: "Показывать курсоры",
  you: "Ты здесь как",
  hint: "Курсоры анонимные и видны только тем, кто на той же странице. Выключишь, и твой курсор тоже пропадёт у других.",
  touch: "На телефоне курсоров нет, только счётчик.",
};
const en: typeof ru = {
  online: "online",
  label: (n) => `On the site now: ${n}`,
  cursors: "Show cursors",
  you: "You appear as",
  hint: "Cursors are anonymous and only visible to people on the same page. Turn them off and yours disappears for others too.",
  touch: "No cursors on touch screens, just the counter.",
};
export const liveStrings = (l: L) => (l === "ru" ? ru : en);
