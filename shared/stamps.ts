export type Frame = "postage" | "seal" | "ticket" | "customs" | "postmark" | "shield" | "rosette" | "hex";
export type StampKind = "egg" | "action";

export type StampDef = {
  id: string;
  kind: StampKind;
  icon: string;
  frame: Frame;
  hue: number;
  ru: [title: string, hint: string];
  en: [title: string, hint: string];
};

const egg = (
  id: string,
  icon: string,
  frame: Frame,
  hue: number,
  ru: [string, string],
  en: [string, string],
): StampDef => ({
  id,
  kind: "egg",
  icon,
  frame,
  hue,
  ru,
  en,
});

const act = (
  id: string,
  icon: string,
  frame: Frame,
  hue: number,
  ru: [string, string],
  en: [string, string],
): StampDef => ({
  id,
  kind: "action",
  icon,
  frame,
  hue,
  ru,
  en,
});

// Easter eggs are found in the browser, so the server takes them on trust. Actions are awarded by the server.
export const STAMPS: StampDef[] = [
  egg(
    "terminal",
    "terminal",
    "customs",
    140,
    ["Терминал", "Нажми клавишу ` (буква ё)"],
    ["Terminal", "Press the ` key"],
  ),
  egg(
    "sudo",
    "lock",
    "shield",
    0,
    ["Не положено", "Попроси в терминале права администратора"],
    ["Not allowed", "Ask the terminal for admin rights"],
  ),
  egg(
    "sandwich",
    "sandwich",
    "ticket",
    30,
    ["Бутерброд", "Вежливо попроси терминал сделать бутерброд"],
    ["Sandwich", "Politely ask the terminal for a sandwich"],
  ),
  egg(
    "rmrf",
    "skull",
    "seal",
    350,
    ["Всё удалено", "Самая опасная команда в мире"],
    ["Everything deleted", "The most dangerous command in the world"],
  ),
  egg(
    "matrix",
    "matrix",
    "customs",
    120,
    ["Красная таблетка", "Войди в матрицу"],
    ["Red pill", "Enter the matrix"],
  ),
  egg(
    "hidden",
    "file",
    "postage",
    200,
    ["Скрытый файл", "Не все файлы видны сразу"],
    ["Hidden file", "Not every file shows up at once"],
  ),
  egg(
    "teapot",
    "teapot",
    "postmark",
    25,
    ["Я чайник", "Свари кофе в терминале"],
    ["I'm a teapot", "Brew some coffee in the terminal"],
  ),
  egg("hacker", "mask", "shield", 160, ["Взломщик", "Взломай что-нибудь"], ["Hacker", "Hack something"]),
  egg(
    "vim",
    "vim",
    "hex",
    100,
    ["Выбрался из Vim", "Открой vim и попробуй выйти"],
    ["Escaped Vim", "Open vim and try to quit"],
  ),
  egg(
    "origin",
    "cube",
    "rosette",
    270,
    ["Откуда ник", "Спроси терминал, кто такой snak"],
    ["Where the nick comes from", "Ask the terminal who snak is"],
  ),
  egg(
    "cowsay",
    "cow",
    "postage",
    45,
    ["Говорящая корова", "Пусть корова что-нибудь скажет"],
    ["Talking cow", "Make the cow say something"],
  ),
  egg(
    "answer",
    "answer",
    "seal",
    220,
    ["Ответ", "Главный вопрос жизни, вселенной и всего такого"],
    ["The answer", "Life, the universe and everything"],
  ),
  egg(
    "konami",
    "dpad",
    "hex",
    280,
    ["Код Konami", "Классический чит-код"],
    ["Konami code", "The classic cheat code"],
  ),
  egg(
    "cat",
    "cat",
    "rosette",
    330,
    ["Котолюб", "Котик любит, когда его гладят. Много раз"],
    ["Cat person", "The cat likes being petted. A lot"],
  ),
  egg(
    "name",
    "badge",
    "ticket",
    255,
    ["Моё имя", "Напечатай моё имя где угодно на сайте"],
    ["My name", "Type my name anywhere on the site"],
  ),
  egg(
    "retro",
    "crt",
    "postmark",
    190,
    ["Машина времени", "Вернись в 2003 год"],
    ["Time machine", "Go back to 2003"],
  ),
  egg(
    "owl",
    "moon",
    "seal",
    230,
    ["Сова", "Загляни сюда глубокой ночью"],
    ["Night owl", "Drop by late at night"],
  ),
  egg(
    "devtools",
    "code",
    "customs",
    175,
    ["Коллега", "Загляни в консоль браузера"],
    ["Fellow dev", "Look into the browser console"],
  ),
  egg(
    "umbrella",
    "umbrella",
    "postmark",
    210,
    ["Зонтик", "Постой с курсором под дождём"],
    ["Umbrella", "Stand in the rain with your cursor"],
  ),
  egg(
    "reader",
    "book",
    "postage",
    60,
    ["Дочитал", "Прочитай пост до самого конца"],
    ["Read it all", "Read a post to the very end"],
  ),
  egg(
    "explorer",
    "compass",
    "rosette",
    90,
    ["Исследователь", "Побывай на всех страницах"],
    ["Explorer", "Visit every page"],
  ),
  egg(
    "back",
    "back",
    "postmark",
    340,
    ["Вернулся", "Уйди с вкладки и вернись"],
    ["Came back", "Leave the tab and come back"],
  ),
  egg(
    "lost",
    "page",
    "ticket",
    15,
    ["Заблудился", "Найди страницу, которой нет"],
    ["Lost", "Find a page that does not exist"],
  ),
  egg(
    "designer",
    "palette",
    "rosette",
    310,
    ["Дизайнер", "Собери свою палитру в настройках"],
    ["Designer", "Build your own palette in the settings"],
  ),
  egg(
    "hotkeys",
    "key",
    "hex",
    150,
    ["Горячие клавиши", "Есть клавиши для темы и языка"],
    ["Hotkeys", "There are keys for theme and language"],
  ),
  egg(
    "weatherman",
    "cloud",
    "postage",
    195,
    ["Синоптик", "Поменяй погоду на сайте"],
    ["Weatherman", "Change the weather on the site"],
  ),
  act(
    "guest",
    "chat",
    "postmark",
    265,
    ["Гость", "Оставь запись в гостевой книге"],
    ["Guest", "Sign the guestbook"],
  ),
  act("postcard", "mail", "postage", 20, ["Открытка", "Отправь открытку"], ["Postcard", "Send a postcard"]),
  act(
    "capsule",
    "capsule",
    "hex",
    185,
    ["Капсула времени", "Запечатай капсулу времени"],
    ["Time capsule", "Seal a time capsule"],
  ),
  act(
    "gardener",
    "flower",
    "rosette",
    120,
    ["Садовник", "Посади что-нибудь в саду"],
    ["Gardener", "Plant something in the garden"],
  ),
  act(
    "word",
    "tiles",
    "ticket",
    45,
    ["Слово дня", "Отгадай слово дня"],
    ["Word of the day", "Guess the word of the day"],
  ),
  act(
    "word7",
    "flame",
    "rosette",
    45,
    ["Серия 7 дней", "Отгадывай слово дня неделю подряд"],
    ["7 day streak", "Guess the word a week in a row"],
  ),
  act(
    "quick",
    "bolt",
    "shield",
    0,
    ["Быстрая реакция", "Нажми быстрее 250 мс в тесте реакции"],
    ["Quick hands", "Beat 250 ms in the reaction test"],
  ),
  act(
    "champion",
    "trophy",
    "shield",
    45,
    ["Чемпион недели", "Лучшая реакция за неделю"],
    ["Champion of the week", "Best reaction time of a week"],
  ),
  egg(
    "rareguest",
    "paw",
    "postmark",
    20,
    ["Редкий гость", "Заметь в саду того, кто заходит нечасто"],
    ["Rare guest", "Spot someone in the garden who rarely shows up"],
  ),
];

export const EGGS = new Set(STAMPS.filter((s) => s.kind === "egg").map((s) => s.id));
export const stampDef = (id: string) => STAMPS.find((s) => s.id === id);

// Country stamps look like "c:RU". Cloudflare uses XX for unknown and T1 for Tor.
export const isCountryStamp = (code: string) =>
  /^c:[A-Z]{2}$/.test(code) && code !== "c:XX" && code !== "c:T1";

export type Season = "newyear" | "halloween" | "valentine" | "aprilfools" | "cosmos" | "programmer";

export function seasonOf(d = new Date()): Season | null {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if ((m === 12 && day >= 20) || (m === 1 && day <= 10)) return "newyear";
  if ((m === 10 && day >= 24) || (m === 11 && day <= 2)) return "halloween";
  if (m === 2 && day >= 12 && day <= 15) return "valentine";
  if (m === 4 && day === 1) return "aprilfools";
  if (m === 4 && day >= 11 && day <= 13) return "cosmos";
  if (m === 9 && day >= 12 && day <= 14) return "programmer";
  return null;
}

// "s:newyear:2027". New Year belongs to the year that starts.
export function seasonStamp(d = new Date()) {
  const s = seasonOf(d);
  if (!s) return null;
  const year = s === "newyear" && d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear();
  return `s:${s}:${year}`;
}

export const isSeasonStamp = (code: string) =>
  /^s:(newyear|halloween|valentine|aprilfools|cosmos|programmer):\d{4}$/.test(code);
