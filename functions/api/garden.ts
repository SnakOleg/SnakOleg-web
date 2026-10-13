import { MAX_STAGE, isPlant } from "../../shared/garden";
import { dayNumber } from "../../shared/words";
import { getUser, requireUser } from "./_blog";
import { Env, json, limit } from "./_lib";
import { award } from "./_stamps";

type Mine = { kind: string; stage: number; watered: number };

const view = (m: Mine | null) =>
  m ? { kind: m.kind, stage: m.stage, can: m.stage < MAX_STAGE && m.watered !== dayNumber() } : null;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const u = await getUser(request, env);
  const { results } = await env.DB.prepare(
    "SELECT g.kind, g.stage, g.gifts, u.name, g.user_id FROM garden g JOIN users u ON u.id=g.user_id ORDER BY g.stage DESC, g.planted LIMIT 60",
  ).all<{ kind: string; stage: number; gifts: number; name: string; user_id: string }>();
  const mine = u
    ? await env.DB.prepare("SELECT kind,stage,watered FROM garden WHERE user_id=?").bind(u.id).first<Mine>()
    : null;
  return json({
    plants: results.map((r) => ({
      id: r.user_id,
      kind: r.kind,
      stage: r.stage,
      gifts: r.gifts,
      name: r.name,
      own: r.user_id === u?.id,
    })),
    mine: view(mine),
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (u instanceof Response) return u;
  if (!(await limit(env, `gd:${u.id}`, 40, 3600))) return json({ error: "too_many" }, 429);
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    kind?: unknown;
    target?: unknown;
  } | null;
  const mine = await env.DB.prepare("SELECT kind,stage,watered FROM garden WHERE user_id=?")
    .bind(u.id)
    .first<Mine>();

  if (body?.action === "plant") {
    if (mine || !isPlant(body.kind)) return json({ error: "invalid" }, 400);
    await env.DB.prepare("INSERT INTO garden(user_id,kind,stage,watered,planted) VALUES (?,?,0,0,?)")
      .bind(u.id, body.kind, Date.now())
      .run();
    await award(env, u.id, ["gardener"]);
    return json({ mine: view({ kind: body.kind, stage: 0, watered: 0 }), added: ["gardener"] }, 201);
  }
  if (body?.action === "water") {
    if (!mine) return json({ error: "invalid" }, 400);
    const day = dayNumber();
    if (mine.stage >= MAX_STAGE || mine.watered === day) return json({ error: "done" }, 409);
    const stage = mine.stage + 1;
    await env.DB.prepare("UPDATE garden SET stage=?, watered=? WHERE user_id=?").bind(stage, day, u.id).run();
    return json({ mine: view({ ...mine, stage, watered: day }) });
  }
  if (body?.action === "gift") {
    const target = String(body.target ?? "");
    if (!target || target === u.id) return json({ error: "invalid" }, 400);
    if (!(await limit(env, `gg:${u.id}:${dayNumber()}`, 5, 86400))) return json({ error: "done" }, 409);
    const res = await env.DB.prepare("UPDATE garden SET gifts=gifts+1 WHERE user_id=?").bind(target).run();
    if (!res.meta.changes) return json({ error: "not_found" }, 404);
    return json({ ok: true });
  }
  if (body?.action === "dig") {
    await env.DB.prepare("DELETE FROM garden WHERE user_id=?").bind(u.id).run();
    return json({ mine: null });
  }
  return json({ error: "invalid" }, 400);
};
