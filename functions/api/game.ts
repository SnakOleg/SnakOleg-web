import {
  QUICK_MIN,
  QUICK_STAMP,
  WORD_TRIES,
  dayNumber,
  normalize,
  score,
  validGuess,
  weekNumber,
  wordOf,
} from "../../shared/words";
import { KNOWN } from "../../shared/dictionary";
import { getUser, requireUser } from "./_blog";
import { Env, geo, json, limit } from "./_lib";
import { award } from "./_stamps";

const LOST = 99;

async function streakOf(env: Env, userId: string) {
  const { results } = await env.DB.prepare(
    "SELECT day,score FROM games WHERE user_id=? AND kind='word' ORDER BY day DESC LIMIT 60",
  )
    .bind(userId)
    .all<{ day: number; score: number }>();
  const won = new Set(results.filter((r) => r.score < LOST).map((r) => r.day));
  const today = dayNumber();
  let day = won.has(today) ? today : today - 1;
  let n = 0;
  while (won.has(day)) {
    n++;
    day--;
  }
  return n;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const q = new URL(request.url).searchParams;
  const kind = q.get("kind");

  if (kind === "word") {
    const day = dayNumber();
    const guess = q.get("g");
    if (guess === null) {
      const u = await getUser(request, env);
      return json({ day, streak: u ? await streakOf(env, u.id) : 0 });
    }
    if (!(await limit(env, `gw:${geo(request).ip}`, 240, 3600))) return json({ error: "too_many" }, 429);
    const g = normalize(guess);
    if (!validGuess(g)) return json({ error: "invalid" }, 400);
    if (!KNOWN.has(g)) return json({ error: "unknown" }, 422);
    const answer = wordOf(day);
    const tries = Math.min(WORD_TRIES, Math.max(1, Math.floor(Number(q.get("n")) || 1)));
    const p = score(g, answer);
    const over = p === "ggggg" || tries >= WORD_TRIES;
    return json({ day, p, ...(over ? { answer } : {}) });
  }

  if (kind === "quick") {
    const u = await getUser(request, env);
    const week = weekNumber();
    const board = (w: number, n: number) =>
      env.DB.prepare(
        "SELECT g.score ms, u.name, u.picture, g.user_id FROM games g JOIN users u ON u.id=g.user_id WHERE g.kind='quickw' AND g.day=? ORDER BY g.score, g.created LIMIT ?",
      )
        .bind(w, n)
        .all<{ ms: number; name: string; picture: string; user_id: string }>();
    const [all, now, last, mine] = await Promise.all([
      env.DB.prepare(
        "SELECT g.score ms, u.name, u.picture FROM games g JOIN users u ON u.id=g.user_id WHERE g.kind='quick' ORDER BY g.score LIMIT 10",
      ).all<{ ms: number; name: string; picture: string }>(),
      board(week, 5),
      board(week - 1, 1),
      u
        ? env.DB.prepare("SELECT score FROM games WHERE user_id=? AND kind='quick'")
            .bind(u.id)
            .first<{ score: number }>()
        : null,
    ]);
    // Last week's winner gets the champion stamp the first time anyone looks at the board this week.
    const champ = last.results[0];
    if (champ && (await limit(env, `champ:${week}`, 1, 8 * 86400)))
      await award(env, champ.user_id, ["champion"]);
    const strip = ({ ms, name, picture }: { ms: number; name: string; picture: string }) => ({
      ms,
      name,
      picture,
    });
    return json({
      t: Date.now(),
      top: all.results,
      week: now.results.map(strip),
      champion: champ ? strip(champ) : null,
      mine: mine?.score ?? null,
    });
  }

  return json({ error: "invalid" }, 400);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (u instanceof Response) return u;
  if (!(await limit(env, `gp:${u.id}`, 60, 3600))) return json({ error: "too_many" }, 429);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (body?.kind === "word") {
    const tries = Math.floor(Number(body.tries));
    if (Number(body.day) !== dayNumber() || tries < 1 || tries > WORD_TRIES)
      return json({ error: "invalid" }, 400);
    const won = body.won === true;
    await env.DB.prepare("INSERT OR IGNORE INTO games(user_id,kind,day,score,created) VALUES (?,?,?,?,?)")
      .bind(u.id, "word", dayNumber(), won ? tries : LOST, Date.now())
      .run();
    const streak = await streakOf(env, u.id);
    const codes = [...(won ? ["word"] : []), ...(streak >= 7 ? ["word7"] : [])];
    await award(env, u.id, codes);
    return json({ streak, added: codes });
  }

  if (body?.kind === "quick") {
    const ms = Math.round(Number(body.ms));
    const t = Number(body.t);
    const age = Date.now() - t;
    // The start token proves the round took at least as long as the reported reaction plus the wait.
    if (
      !Number.isFinite(ms) ||
      ms < QUICK_MIN ||
      ms > 5000 ||
      !Number.isFinite(t) ||
      age < ms + 900 ||
      age > 120_000
    )
      return json({ error: "invalid" }, 400);
    const upsert =
      "INSERT INTO games(user_id,kind,day,score,created) VALUES (?,?,?,?,?) ON CONFLICT(user_id,kind,day) DO UPDATE SET score=MIN(score,excluded.score)";
    await env.DB.batch([
      env.DB.prepare(upsert).bind(u.id, "quick", 0, ms, Date.now()),
      env.DB.prepare(upsert).bind(u.id, "quickw", weekNumber(), ms, Date.now()),
    ]);
    const codes = ms < QUICK_STAMP ? ["quick"] : [];
    await award(env, u.id, codes);
    const best = await env.DB.prepare("SELECT score FROM games WHERE user_id=? AND kind='quick'")
      .bind(u.id)
      .first<{ score: number }>();
    return json({ best: best?.score ?? ms, added: codes });
  }

  return json({ error: "invalid" }, 400);
};
