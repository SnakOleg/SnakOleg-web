import type { L } from "../lib/i18n";
import type { Holiday, Sky } from "./prefs";

const ru = {
  weather: "Погода",
  holidays: "Праздники",
  sky: {
    auto: "Как за окном",
    off: "Выключена",
    clear: "Ясно",
    clouds: "Облачно",
    rain: "Дождь",
    downpour: "Ливень",
    storm: "Гроза",
    snow: "Снег",
    fog: "Туман",
  } as Record<Sky, string>,
  holiday: {
    auto: "По календарю",
    off: "Выключены",
    newyear: "Новый год",
    halloween: "Хэллоуин",
    valentine: "День святого Валентина",
  } as Record<Holiday, string>,
  now: (city: string, temp: number, what: string) =>
    `${city ? `Сейчас в городе ${city}` : "Сейчас"}: ${temp > 0 ? "+" : ""}${temp}°, ${what.toLowerCase()}`,
  unknown: "Погода недоступна, эффект выключен",
  motion: "У тебя включено «уменьшить движение», поэтому авто-эффекты выключены",
};

const en: typeof ru = {
  weather: "Weather",
  holidays: "Holidays",
  sky: {
    auto: "Like outside",
    off: "Off",
    clear: "Clear",
    clouds: "Cloudy",
    rain: "Rain",
    downpour: "Downpour",
    storm: "Thunderstorm",
    snow: "Snow",
    fog: "Fog",
  },
  holiday: {
    auto: "By calendar",
    off: "Off",
    newyear: "New Year",
    halloween: "Halloween",
    valentine: "Valentine's Day",
  },
  now: (city, temp, what) =>
    `${city ? `Now in ${city}` : "Now"}: ${temp > 0 ? "+" : ""}${temp}°, ${what.toLowerCase()}`,
  unknown: "Weather is unavailable, the effect is off",
  motion: "Reduce motion is on in your system, so automatic effects are off",
};

export const wxStrings = (l: L) => (l === "ru" ? ru : en);
