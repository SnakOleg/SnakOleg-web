import { createContext, FunctionalComponent, ComponentChildren } from "preact";
import { useState, useContext } from "preact/hooks";

type Lang = "ru" | "en";

interface LangCtx {
    lang: Lang;
    toggleLang: () => void;
}

const LanguageContext = createContext<LangCtx>({
    lang: "ru",
    toggleLang: () => undefined,
});

interface LanguageProviderProps {
    children: ComponentChildren;
}

export const LanguageProvider: FunctionalComponent<LanguageProviderProps> = ({ children }) => {
    const [lang, setLang] = useState<Lang>(() => {
        const savedLang = localStorage.getItem("lang") as Lang | null;
        return savedLang ?? "ru";
    });

    const toggleLang = () => {
        const newLang = lang === "ru" ? "en" : "ru";
        setLang(newLang);
        localStorage.setItem("lang", newLang);
    };

    return (
        <LanguageContext.Provider value={{ lang, toggleLang }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LangCtx => useContext(LanguageContext);
