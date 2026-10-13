import { CAPSULE_ACTIVE, CAPSULE_MAX, CAPSULE_MAX_MS, CAPSULE_MIN_MS } from "../../shared/garden";
import { cleanText } from "../../shared/blog";
import { getUser, requireUser } from "./_blog";
import { Env, json, limit } from "./_lib";
import { award } from "./_stamps";

type Mine = { id: number; body: string; created: number; opens: number; opened: number | null };

// The text of a sealed capsule never leaves the server before its date.
const mineOf = (r: Mine) => ({
  id: r.id,
  created: r.created,
  opens: r.opens,
  opened: r.opened,
  ...(r.opens <= Date.now() ? { body: r.body } : {}),
});

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const u = await getUser(request, env);
  const [vault, total] = await Promise.all([
    env.DB.prepare(
      "SELECT c.opens, u.name FROM capsules c JOIN users u ON u.id=c.user_id WHERE c.opened IS NULL ORDER BY c.opens LIMIT 24",
    ).all<{ opens: number; name: string }>(),
    env.DB.prepare("SELECT COUNT(*) n FROM capsules WHERE opened IS NULL").first<{ n: number }>(),
  ]);
  const mine = u
    ? await env.DB.prepare("SELECT id,body,created,opens,opened FROM capsules WHERE user_id=? ORDER BY opens")
        .bind(u.id)
        .all<Mine>()
    : null;
  return json({ vault: vault.results, total: total?.n ?? 0, mine: mine?.results.map(mineOf) ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (u instanceof Response) return u;
  if (!(await limit(env, `cp:${u.id}`, 20, 3600))) return json({ error: "too_many" }, 429);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const now = Date.now();

  if (body?.open != null) {
    const row = await env.DB.prepare(
      "SELECT id,body,created,opens,opened FROM capsules WHERE id=? AND user_id=?",
    )
      .bind(Number(body.open), u.id)
      .first<Mine>();
    if (!row) return json({ error: "not_found" }, 404);
    if (row.opens > now) return json({ error: "sealed" }, 403);
    if (!row.opened) await env.DB.prepare("UPDATE capsules SET opened=? WHERE id=?").bind(now, row.id).run();
    return json({ capsule: mineOf({ ...row, opened: row.opened ?? now }) });
  }

  const text = cleanText(body?.body, CAPSULE_MAX + 1);
  const opens = Math.round(Number(body?.opens));
  if (!text || !Number.isFinite(opens)) return json({ error: "invalid" }, 400);
  if (text.length > CAPSULE_MAX) return json({ error: "too_long" }, 413);
  if (opens < now + CAPSULE_MIN_MS || opens > now + CAPSULE_MAX_MS) return json({ error: "bad_date" }, 400);
  const active = await env.DB.prepare("SELECT COUNT(*) n FROM capsules WHERE user_id=? AND opened IS NULL")
    .bind(u.id)
    .first<{ n: number }>();
  if ((active?.n ?? 0) >= CAPSULE_ACTIVE) return json({ error: "limit" }, 409);
  const row = await env.DB.prepare(
    "INSERT INTO capsules(user_id,body,created,opens) VALUES (?,?,?,?) RETURNING id",
  )
    .bind(u.id, text, now, opens)
    .first<{ id: number }>();
  await award(env, u.id, ["capsule"]);
  return json({ capsule: { id: row!.id, created: now, opens, opened: null }, added: ["capsule"] }, 201);
};
