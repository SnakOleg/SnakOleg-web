import ru from "../i18n/ru.json";
import en from "../i18n/en.json";

type Translations = typeof ru;

const translations = { ru, en };

export function useLang(lang: "ru" | "en" = "ru"): Translations {
    return translations[lang];
}
