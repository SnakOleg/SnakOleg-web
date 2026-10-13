import { useState } from "preact/hooks";
import { seasonOf } from "../../shared/stamps";
import type { L } from "../lib/i18n";
import { Ico } from "./ui/Icon";

const TEXT: Record<string, { icon: string; ru: string; en: string }> = {
  newyear: {
    icon: "🎄",
    ru: "Новогодний сайт: снег, гирлянда, ёлка в саду и сезонный штамп в паспорте.",
    en: "New Year mode: snow, a garland, a tree in the garden and a seasonal stamp.",
  },
  halloween: {
    icon: "🎃",
    ru: "Хэллоуин: тыквы и летучие мыши в саду, жители в костюмах и сезонный штамп.",
    en: "Halloween: pumpkins and bats in the garden, villagers in costumes and a seasonal stamp.",
  },
  valentine: {
    icon: "💌",
    ru: "День влюблённых: отправь открытку в гостевую книгу и забери сезонный штамп.",
    en: "Valentine's Day: send a postcard to the guestbook and grab a seasonal stamp.",
  },
  aprilfools: {
    icon: "🥨",
    ru: "Сегодня я Snack. Всего один день в году.",
    en: "Today I'm Snack. Just one day a year.",
  },
  cosmos: {
    icon: "🚀",
    ru: "День космонавтики: следи за небом и забери сезонный штамп.",
    en: "Cosmonautics Day: watch the sky and grab a seasonal stamp.",
  },
  programmer: {
    icon: "⌨️",
    ru: "День программиста: 256-й день года. Загляни в терминал.",
    en: "Programmers' Day: the 256th day of the year. Check the terminal.",
  },
};

const LINK: Record<L, string> = { ru: "В сад", en: "To the garden" };

export function EventBanner({ l }: { l: L }) {
  const now = seasonOf();
  const key = `snak-event-${now}-${new Date().getFullYear()}`;
  const [gone, setGone] = useState(() => {
    try {
      return !!localStorage.getItem(key);
    } catch {
      return false;
    }
  });
  const t = now ? TEXT[now] : undefined;
  if (!t || gone) return null;
  const close = () => {
    setGone(true);
    try {
      localStorage.setItem(key, "1");
    } catch {
      // private mode
    }
  };
  return (
    <aside class="evb" role="note">
      <span class="evi" aria-hidden="true">
        {t.icon}
      </span>
      <p>{t[l]}</p>
      {now !== "aprilfools" && <a href="/games/garden">{LINK[l]}</a>}
      <button type="button" aria-label="×" onClick={close}>
        <Ico n="x" />
      </button>
    </aside>
  );
}
