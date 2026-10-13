import { EMOJI } from "../../../shared/blog";
import { Env } from "../_lib";

export type Counts = Record<string, number>;

export async function reactionsFor(env: Env, kind: "post" | "comment", ids: number[], me: string | null) {
  const counts = new Map<number, Counts>();
  const mine = new Map<number, string[]>();
  if (!ids.length) return { counts, mine };
  const marks = ids.map(() => "?").join(",");
  const rows = await env.DB.prepare(
    `SELECT target, emoji, COUNT(*) n FROM reactions WHERE kind=? AND target IN (${marks}) GROUP BY target, emoji`,
  )
    .bind(kind, ...ids)
    .all<{ target: number; emoji: string; n: number }>();
  for (const r of rows.results) counts.set(r.target, { ...counts.get(r.target), [r.emoji]: r.n });
  if (me) {
    const own = await env.DB.prepare(
      `SELECT target, emoji FROM reactions WHERE kind=? AND user_id=? AND target IN (${marks})`,
    )
      .bind(kind, me, ...ids)
      .all<{ target: number; emoji: string }>();
    for (const r of own.results) mine.set(r.target, [...(mine.get(r.target) ?? []), r.emoji]);
  }
  return { counts, mine };
}

export const isEmoji = (v: unknown): v is (typeof EMOJI)[number] => EMOJI.includes(v as never);

export const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);

/** Hides or deletes a comment together with every reply under it, at any depth. */
export async function closeThread(env: Env, id: number, status: "hidden" | "deleted") {
  await env.DB.prepare(
    `WITH RECURSIVE t(id) AS (
       SELECT ?1
       UNION
       SELECT c.id FROM comments c JOIN t ON c.reply_to=t.id OR (c.reply_to IS NULL AND c.parent_id=t.id)
     )
     UPDATE comments SET status=?2, pinned=0${status === "deleted" ? ", body=''" : ""} WHERE id IN (SELECT id FROM t)`,
  )
    .bind(id, status)
    .run();
}
