// What the owner is doing right now, set from the Telegram bot.
export const NOW_TTL_MS = 12 * 3_600_000;
export const NOW_TEXT_MAX = 60;

export type NowPreset = { id: string; icon: string; ru: string; en: string };

export const NOW_PRESETS: NowPreset[] = [
  { id: "code", icon: "💻", ru: "Пишу код", en: "Writing code" },
  { id: "game", icon: "🎮", ru: "Играю", en: "Playing games" },
  { id: "walk", icon: "🚶", ru: "Гуляю по Питеру", en: "Walking around Petersburg" },
  { id: "eat", icon: "🍜", ru: "Ем", en: "Eating" },
  { id: "coffee", icon: "☕", ru: "Пью кофе", en: "Having coffee" },
  { id: "music", icon: "🎧", ru: "Слушаю музыку", en: "Listening to music" },
  { id: "read", icon: "📖", ru: "Читаю", en: "Reading" },
  { id: "train", icon: "🏋️", ru: "Тренируюсь", en: "Working out" },
  { id: "road", icon: "🚇", ru: "В дороге", en: "On the move" },
  { id: "chill", icon: "🛋️", ru: "Отдыхаю", en: "Chilling" },
  { id: "sleep", icon: "😴", ru: "Сплю", en: "Sleeping" },
  { id: "study", icon: "🧠", ru: "Учусь", en: "Studying" },
];

export type NowState = { icon: string; ru: string; en: string; ts: number };
