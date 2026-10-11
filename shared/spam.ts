// Comment spam scoring. Pure functions, shared by the API and the tests.
// A score of FLAG_AT or more labels a comment "Возможный спам": it is hidden behind a button, never deleted.
export const FLAG_AT = 3;

export type Flag = "links" | "invite" | "short" | "ads" | "abuse" | "caps" | "repeat" | "copy" | "reports";
export type Verdict = { score: number; flags: Flag[] };

const URL_RE =
  /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|ru|net|org|io|me|xyz|top|club|site|online|shop|bet|win|vip|ly|gl|cc|tk|ml)\b\S*/gi;
const INVITE = /t\.me\/(?:\+|joinchat)|telegram\.me\/joinchat|discord\.gg\/|chat\.whatsapp\.com/i;
const SHORT =
  /\b(?:bit\.ly|tinyurl\.com|goo\.gl|t\.co|cutt\.ly|clck\.ru|is\.gd|ow\.ly|rb\.gy|shorturl\.at)\b/i;
const ADS = [
  /заработ/,
  /казино/,
  /ставк[аиу]/,
  /букмекер/,
  /крипт/,
  /инвестиц/,
  /пассивн\w* доход/,
  /подпис(?:ывай|ывайтесь|ись|ка на)/,
  /скидк/,
  /розыгрыш/,
  /переходи по ссылке/,
  /пиши в (?:лс|личку|тг|телеграм)/,
  /\b(?:casino|bonus|airdrop|giveaway|crypto|forex|viagra|porn|onlyfans)\b/,
  /earn \$?\d+/,
  /free money/,
  /\b18\+/,
  /100\s?%\s?(?:гарант|result|win)/,
];
const ABUSE = [
  /(?:^|[^а-я])ху[йяеию]/,
  /(?:^|[^а-я])пизд/,
  /(?:^|[^а-я])[её]б[аоуи]н/,
  /(?:^|[^а-я])[её]бан/,
  /(?:^|[^а-я])ебл[аи]/,
  /(?:^|[^а-я])бля[дт]/,
  /(?:^|[^а-я])муда[кч]/,
  /(?:^|[^а-я])пидор/,
  /(?:^|[^а-я])гандон/,
  /(?:^|[^а-я])сука/,
  /(?:^|[^а-я])залуп/,
  /(?:^|[^а-я])долбо[её]б/,
  /(?:^|[^a-z])fuck/,
  /(?:^|[^a-z])shit/,
  /(?:^|[^a-z])bitch/,
  /(?:^|[^a-z])cunt/,
  /(?:^|[^a-z])nigg/,
  /(?:^|[^a-z])faggot/,
  /(?:^|[^a-z])kys\b/,
];
// Latin letters that pretend to be Cyrillic ones (and common leetspeak) for the normalised pass.
const LOOK: Record<string, string> = {
  a: "а",
  b: "в",
  c: "с",
  e: "е",
  h: "н",
  k: "к",
  m: "м",
  o: "о",
  p: "р",
  t: "т",
  x: "х",
  y: "у",
  "0": "о",
  "3": "з",
  "4": "а",
  "6": "б",
};

// "х у й" or "х.у.й" -> "хуй": spaced-out single letters are glued back together.
const unspace = (s: string) =>
  s.replace(/(?:^|(?<=\s))(?:\p{L}[\s.\-_*]+){2,}\p{L}(?=\s|$)/gu, (m) => m.replace(/[\s.\-_*]+/g, ""));

const fold = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/​|­/g, "");
const cyr = (s: string) => s.replace(/[a-z0-9]/g, (c) => LOOK[c] ?? c);

export function scoreComment(raw: string, opts: { copied?: boolean; newUser?: boolean } = {}): Verdict {
  const flags = new Set<Flag>();
  let score = 0;
  const add = (n: number, f: Flag) => {
    score += n;
    flags.add(f);
  };
  const text = fold(raw);

  const links = text.match(URL_RE)?.length ?? 0;
  if (links >= 2) add(3, "links");
  else if (links === 1) add(opts.newUser ? 2 : 1, "links");
  if (INVITE.test(text)) add(3, "invite");
  if (SHORT.test(text)) add(2, "short");

  const ads = ADS.filter((r) => r.test(text)).length;
  if (ads) add(Math.min(4, 2 * ads), "ads");

  const glued = unspace(text);
  const hay = [text, glued, cyr(glued)];
  if (ABUSE.some((r) => hay.some((h) => r.test(h)))) add(3, "abuse");

  const letters = raw.replace(/[^\p{L}]/gu, "");
  if (letters.length > 12 && (letters.match(/\p{Lu}/gu)?.length ?? 0) / letters.length > 0.7) add(1, "caps");
  if (/(.)\1{7,}/u.test(raw)) add(1, "repeat");
  const words = text.match(/\p{L}{2,}/gu) ?? [];
  const seen = new Map<string, number>();
  for (const w of words) seen.set(w, (seen.get(w) ?? 0) + 1);
  if (words.length >= 6 && Math.max(...seen.values()) >= 5) add(2, "repeat");

  if (opts.copied) add(3, "copy");
  return { score, flags: [...flags] };
}

export const isSpam = (v: Verdict) => v.score >= FLAG_AT;
