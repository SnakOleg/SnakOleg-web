// Word of the day: five Cyrillic letters, six tries, one word per Moscow day.
export const WORD_LEN = 5;
export const WORD_TRIES = 6;

export const ANSWERS =
  "арбуз арена атлас банан барак башня белка берег бетон билет блюдо бочка брюки будка букет булка вагон ведро ветер вечер вилка вишня влага вокал волна ворон выбор галка гараж герой глина голос гонка горло город гость грань гроза груша губка дверь декор дождь доска дочка дрозд дубль дурак дуэль дымка жених жизнь жираф забор завод загар закат запад заряд зебра земля зерно знамя игрок идеал излом икота искра книга кобра козел колос комод конец копье корка кошка крыша кукла купол курок кухня лавка лампа лента лодка ложка магия майка малыш маска масло мачта метро мешок миска мишка молот мороз мотор набор навык налог напор народ нитка носок образ овраг огонь озеро океан олень орган осень отзыв охота палец палка папка парта пауза перец песок петля пилот пирог пламя плеер племя плита поезд полка порог почта принц птица пурга радио рамка ребро рыбак рынок сабля садик салат санки свеча север склон слива слово слуга смена смола сосна спина спорт ссора стадо стена степь столб страх сумка сутки сцена табло тайна танец театр товар трава тропа туман тумба удача уклон улица успех фасад ферма фрукт хвост холод хомяк цифра чайка чашка чехол число шапка шахта шорох штора шутка щенок щетка эпоха юноша ягода якорь".split(
    " ",
  );

const DAY = 86_400_000;
const MSK = 3 * 3_600_000;

export const dayNumber = (t = Date.now()) => Math.floor((t + MSK) / DAY);

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const STEP = [37, 41, 43, 47].find((s) => gcd(s, ANSWERS.length) === 1) ?? 1;

export const wordOf = (day: number) => ANSWERS[(day * STEP) % ANSWERS.length]!;

export const normalize = (s: unknown) =>
  typeof s === "string" ? s.toLowerCase().replaceAll("ё", "е").trim() : "";

export const validGuess = (s: string) => /^[а-я]{5}$/.test(s);

// g: right place, y: elsewhere in the word, b: not there. Repeated letters are counted like in the original game.
export function score(guess: string, answer: string): string {
  const out = Array.from<string>({ length: WORD_LEN }).fill("b");
  const left: Record<string, number> = {};
  for (let i = 0; i < WORD_LEN; i++) {
    if (guess[i] === answer[i]) out[i] = "g";
    else left[answer[i]!] = (left[answer[i]!] ?? 0) + 1;
  }
  for (let i = 0; i < WORD_LEN; i++) {
    const ch = guess[i]!;
    if (out[i] === "g" || !left[ch]) continue;
    out[i] = "y";
    left[ch]--;
  }
  return out.join("");
}

export const QUICK_MIN = 90;
export const QUICK_STAMP = 250;
