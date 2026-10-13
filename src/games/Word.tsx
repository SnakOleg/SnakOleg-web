import { useEffect, useRef, useState } from "preact/hooks";
import { WORD_LEN, WORD_TRIES } from "../../shared/words";
import { api, currentMe } from "../blog/api";
import { toast } from "../blog/ui";
import { found } from "../stamps/client";
import type { L } from "../lib/i18n";
import { gameStrings } from "./strings";

type Row = { w: string; p: string };
type Save = { day: number; rows: Row[]; answer: string; done: boolean };
type Streak = { last: number; n: number };

const KEYS = ["йцукенгшщзх", "фывапролджэ", "ячсмитьбю"];
const SAVE = "snak-word";
const STREAK = "snak-word-streak";

const load = <T,>(key: string): T | null => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") as T | null;
  } catch {
    return null;
  }
};
const store = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // private mode: progress lasts until the page is closed
  }
};

const MARK: Record<string, string> = { g: "🟩", y: "🟨", b: "⬛" };

export function Word({ l }: { l: L }) {
  const say = toast;
  const t = gameStrings(l);
  const [day, setDay] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [cur, setCur] = useState("");
  const typed = useRef("");
  const edit = (fn: (c: string) => string) => {
    typed.current = fn(typed.current);
    setCur(typed.current);
  };
  const [answer, setAnswer] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [streak, setStreak] = useState(0);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    void (async () => {
      const r = await api<{ day: number; streak: number }>("/api/game?kind=word");
      if (!r.ok) return;
      const saved = load<Save>(SAVE);
      if (saved && saved.day === r.data.day) {
        setRows(saved.rows);
        setAnswer(saved.answer);
        setDone(saved.done);
      }
      setDay(r.data.day);
      const local = load<Streak>(STREAK);
      const mine = local && local.last >= r.data.day - 1 ? local.n : 0;
      setStreak(Math.max(r.data.streak, mine));
    })();
  }, []);

  const bad = (msg: string) => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
    say(msg);
  };

  const submit = async () => {
    if (busy || done || !day) return;
    if (typed.current.length !== WORD_LEN) return bad(t.short);
    setBusy(true);
    const r = await api<{ p: string; answer?: string }>(
      `/api/game?kind=word&g=${encodeURIComponent(typed.current)}&n=${rows.length + 1}`,
    );
    setBusy(false);
    if (!r.ok) return bad(t.offline);
    const next = [...rows, { w: typed.current, p: r.data.p }];
    const won = r.data.p === "g".repeat(WORD_LEN);
    const over = won || next.length >= WORD_TRIES;
    setRows(next);
    edit(() => "");
    setAnswer(r.data.answer ?? "");
    setDone(over);
    store(SAVE, { day, rows: next, answer: r.data.answer ?? "", done: over } satisfies Save);
    if (!over) return;
    const local = load<Streak>(STREAK);
    const n = won ? (local && local.last === day - 1 ? local.n + 1 : local?.last === day ? local.n : 1) : 0;
    store(STREAK, { last: won ? day : 0, n } satisfies Streak);
    setStreak(n);
    if (currentMe()?.user) {
      const s = await api<{ streak: number; added: string[] }>("/api/game", "POST", {
        kind: "word",
        day,
        tries: next.length,
        won,
      });
      if (s.ok) setStreak(s.data.streak);
      if (s.ok) s.data.added.forEach(found);
    }
  };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter") return void submit();
      if (e.key === "Backspace") return edit((c) => c.slice(0, -1));
      const ch = e.key.toLowerCase().replace("ё", "е");
      if (/^[а-я]$/.test(ch) && ch !== "ъ") edit((c) => (c.length < WORD_LEN ? c + ch : c));
    };
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  });

  const press = (k: string) => {
    if (done) return;
    edit((c) => (c.length < WORD_LEN ? c + k : c));
  };

  const state: Record<string, string> = {};
  for (const r of rows)
    [...r.w].forEach((ch, i) => {
      const p = r.p[i]!;
      if (p === "g" || (p === "y" && state[ch] !== "g") || !state[ch]) state[ch] = p;
    });

  const won = rows.at(-1)?.p === "g".repeat(WORD_LEN);
  const share = async () => {
    const text = `${l === "ru" ? "Слово дня" : "Word of the day"} #${day} ${won ? rows.length : "X"}/${WORD_TRIES}\n${rows
      .map((r) => [...r.p].map((c) => MARK[c]).join(""))
      .join("\n")}\n${location.origin}`;
    try {
      await navigator.clipboard.writeText(text);
      say(t.copied);
    } catch {
      say(t.shareFail);
    }
  };

  return (
    <div class="word" data-noshortcuts>
      <div class={`wgrid${shake ? " shake" : ""}`} aria-label={t.word}>
        {Array.from({ length: WORD_TRIES }, (_, y) => {
          const row = rows[y];
          const live = y === rows.length && !done;
          return (
            <div class="wrow" key={y}>
              {Array.from({ length: WORD_LEN }, (_, x) => (
                <span
                  key={x}
                  class={`wt${row ? ` ${row.p[x]}` : ""}${live && cur[x] ? " fill" : ""}`}
                  style={row ? { "--d": `${x * 90}ms` } : undefined}
                >
                  {row ? row.w[x] : live ? (cur[x] ?? "") : ""}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      {done ? (
        <div class="wend">
          <b>{won ? t.won(rows.length) : t.lost(answer)}</b>
          <span>{t.streak(streak)}</span>
          <button type="button" class="gbtn" onClick={() => void share()}>
            {t.share}
          </button>
          <small>{t.next}</small>
        </div>
      ) : (
        <div class="wkeys">
          {KEYS.map((row, i) => (
            <div class="wk" key={row}>
              {i === 2 && (
                <button type="button" class="wide" onClick={() => void submit()}>
                  {t.enter}
                </button>
              )}
              {[...row].map((k) => (
                <button type="button" key={k} class={state[k] ?? ""} onClick={() => press(k)}>
                  {k}
                </button>
              ))}
              {i === 2 && (
                <button
                  type="button"
                  class="wide"
                  aria-label={t.erase}
                  onClick={() => edit((c) => c.slice(0, -1))}
                >
                  ⌫
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {!currentMe()?.user && <p class="gnote">{t.saveHint}</p>}
    </div>
  );
}
