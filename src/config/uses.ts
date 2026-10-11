import { t, T } from "./i18n";

export type UsesKind =
  "laptop" | "phone" | "watch" | "pc" | "monitor" | "keyboard" | "mouse" | "mic" | "apps";
export type UsesRow = { label: string | T; value: string | T };
export type UsesApp = { name: string; abbr: string; hue: number; note?: string | T };
export type UsesWindow = {
  id: string;
  kind: UsesKind;
  title: string | T;
  name: string | T;
  sub?: string | T;
  rows: UsesRow[];
  apps?: UsesApp[];
  /** optional numbers for the counters on the page: memory and storage in GB, refresh rate in Hz */
  ram?: number;
  storage?: number;
  hz?: number;
};

export const uses: UsesWindow[] = [
  {
    id: "macbook",
    kind: "laptop",
    ram: 8,
    storage: 256,
    title: "MacBook Air",
    name: "MacBook Air 13″",
    sub: t("2024, основной ноутбук", "2024, main laptop"),
    rows: [
      { label: t("Чип", "Chip"), value: "Apple M3" },
      { label: t("Память", "Memory"), value: t("8 ГБ", "8 GB") },
      { label: t("Накопитель", "Storage"), value: t("256 ГБ", "256 GB") },
      { label: t("Экран", "Display"), value: t("13 дюймов", "13 inches") },
      { label: t("Год", "Year"), value: "2024" },
    ],
  },
  {
    id: "iphone",
    kind: "phone",
    storage: 128,
    title: "iPhone",
    name: "iPhone 15 Pro",
    sub: t("Телефон", "Phone"),
    rows: [{ label: t("Память", "Storage"), value: t("128 ГБ", "128 GB") }],
  },
  {
    id: "watch",
    kind: "watch",
    title: "Apple Watch",
    name: "Apple Watch Series 8",
    sub: t("Часы", "Watch"),
    rows: [
      { label: t("Корпус", "Case"), value: t("Алюминий", "Aluminium") },
      { label: t("Размер", "Size"), value: t("41 мм", "41 mm") },
    ],
  },
  {
    id: "pc",
    kind: "pc",
    ram: 32,
    storage: 1000,
    title: t("Системный блок", "Desktop PC"),
    name: "Windows 11 Pro",
    sub: t("Рабочий и игровой ПК", "Work and gaming PC"),
    rows: [
      { label: t("Процессор", "Processor"), value: "Intel Core i7-12700 (4,6 GHz)" },
      { label: t("Материнская плата", "Motherboard"), value: "MSI Pro B660M-E DDR4" },
      {
        label: t("Память", "Memory"),
        value: t("32 ГБ DDR4-3200 (2×16 ГБ Apacer)", "32 GB DDR4-3200 (2×16 GB Apacer)"),
      },
      {
        label: t("Видеокарта", "Graphics"),
        value: t("NVIDIA GeForce RTX 3070 Gaming, 8 ГБ", "NVIDIA GeForce RTX 3070 Gaming, 8 GB"),
      },
      { label: t("Блок питания", "Power supply"), value: "AORUS P850W 80+ Gold" },
      {
        label: t("Накопитель", "Storage"),
        value: t("SSD TEAM TM8FPD001T, 1 ТБ", "SSD TEAM TM8FPD001T, 1 TB"),
      },
      { label: t("Система", "System"), value: "Windows 11 Pro" },
    ],
  },
  {
    id: "monitor",
    kind: "monitor",
    title: t("Монитор", "Monitor"),
    name: "Sanc M2292A",
    sub: t("Довольно старый, да", "Quite old, yes"),
    hz: 75,
    rows: [{ label: t("Частота", "Refresh rate"), value: t("75 Гц", "75 Hz") }],
  },
  {
    id: "keyboard",
    kind: "keyboard",
    title: t("Клавиатура", "Keyboard"),
    name: "Akko MonsGeek M1W V3 Black",
    sub: t("Механическая", "Mechanical"),
    rows: [{ label: t("Свитчи", "Switches"), value: "Akko V3 Piano Pro" }],
  },
  {
    id: "mouse",
    kind: "mouse",
    title: t("Мышь", "Mouse"),
    name: "VXE R1 SE+",
    sub: t("Чёрная", "Black"),
    rows: [{ label: t("Цвет", "Colour"), value: t("Чёрный", "Black") }],
  },
  {
    id: "mic",
    kind: "mic",
    title: t("Микрофон", "Microphone"),
    name: "Fifine AM8",
    sub: t("Чёрный", "Black"),
    rows: [
      { label: t("Тип", "Type"), value: t("Динамический", "Dynamic") },
      { label: t("Подключение", "Connection"), value: "USB / XLR" },
    ],
  },
  {
    id: "apps",
    kind: "apps",
    title: t("Программы", "Apps"),
    name: t("Редакторы и инструменты", "Editors and tools"),
    rows: [],
    apps: [
      { name: "WebStorm", abbr: "WS", hue: 190, note: t("Код", "Code") },
      { name: "Photoshop", abbr: "Ps", hue: 215, note: t("Графика", "Graphics") },
      { name: "After Effects", abbr: "Ae", hue: 265, note: t("Анимация", "Motion") },
      { name: "CapCut", abbr: "Cc", hue: 330, note: t("Видео", "Video") },
      { name: "DaVinci Resolve", abbr: "Dr", hue: 25, note: t("Видео и цвет", "Video and color") },
      { name: "Figma", abbr: "Fg", hue: 150, note: t("Дизайн", "Design") },
    ],
  },
  {
    id: "services",
    kind: "apps",
    title: t("Сервисы", "Services"),
    name: t("Для разработки", "For development"),
    rows: [],
    apps: [
      { name: "GitHub", abbr: "Gh", hue: 250, note: t("Репозитории", "Repositories") },
      { name: "Cloudflare", abbr: "Cf", hue: 30, note: t("Хостинг и база", "Hosting and database") },
      { name: "Vercel", abbr: "Vc", hue: 210, note: t("Статистика профиля", "Profile stats") },
    ],
  },
];
