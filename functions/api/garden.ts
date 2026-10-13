import { COLORS, GIFTS_PER_DAY, LOCS, MAX_STAGE, isDeco, isLoc, isPlant } from "../../shared/garden";
import { dayNumber } from "../../shared/words";
import { getUser, requireUser } from "./_blog";
import { Env, json, limit } from "./_lib";
import { award } from "./_stamps";

type Mine = { kind: string; stage: number; watered: number; loc: string; color: number; deco: string };

const view = (m: Mine | null) =>
  m
    ? {
        kind: m.kind,
        stage: m.stage,
        loc: m.loc,
        color: m.color,
        deco: m.deco,
        can: m.stage < MAX_STAGE && m.watered !== dayNumber(),
      }
    : null;

const colorOk = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < COLORS.length;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const u = await getUser(request, env);
  const asked = new URL(request.url).searchParams.get("loc");
  const loc = isLoc(asked) ? asked : "meadow";
  const day = dayNumber();
  const [rows, counts, mine, given] = await Promise.all([
    env.DB.prepare(
      "SELECT g.kind, g.stage, g.gifts, g.color, g.deco, u.name, g.user_id FROM garden g JOIN users u ON u.id=g.user_id WHERE g.loc=? ORDER BY g.stage DESC, g.planted LIMIT 120",
    )
      .bind(loc)
      .all<{
        kind: string;
        stage: number;
        gifts: number;
        color: number;
        deco: string;
        name: string;
        user_id: string;
      }>(),
    env.DB.prepare("SELECT loc, COUNT(*) n FROM garden GROUP BY loc").all<{ loc: string; n: number }>(),
    u
      ? env.DB.prepare("SELECT kind,stage,watered,loc,color,deco FROM garden WHERE user_id=?")
          .bind(u.id)
          .first<Mine>()
      : null,
    u
      ? env.DB.prepare("SELECT target FROM garden_gifts WHERE day=? AND user_id=?")
          .bind(day, u.id)
          .all<{ target: string }>()
      : null,
  ]);
  const done = new Set(given?.results.map((r) => r.target) ?? []);
  return json({
    loc,
    counts: Object.fromEntries(LOCS.map((l) => [l, counts.results.find((r) => r.loc === l)?.n ?? 0])),
    plants: rows.results.map((r) => ({
      id: r.user_id,
      kind: r.kind,
      stage: r.stage,
      gifts: r.gifts,
      color: r.color,
      deco: r.deco,
      name: r.name,
      own: r.user_id === u?.id,
      given: done.has(r.user_id),
    })),
    mine: view(mine),
    giftsLeft: u ? Math.max(0, GIFTS_PER_DAY - done.size) : 0,
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (u instanceof Response) return u;
  if (!(await limit(env, `gd:${u.id}`, 40, 3600))) return json({ error: "too_many" }, 429);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const mine = await env.DB.prepare("SELECT kind,stage,watered,loc,color,deco FROM garden WHERE user_id=?")
    .bind(u.id)
    .first<Mine>();

  if (body?.action === "plant") {
    const loc = body.loc ?? "meadow";
    const color = body.color ?? 0;
    const deco = body.deco ?? "";
    if (mine || !isPlant(body.kind) || !isLoc(loc) || !colorOk(color) || !isDeco(deco))
      return json({ error: "invalid" }, 400);
    await env.DB.prepare(
      "INSERT INTO garden(user_id,kind,stage,watered,planted,loc,color,deco) VALUES (?,?,0,0,?,?,?,?)",
    )
      .bind(u.id, body.kind, Date.now(), loc, color, deco)
      .run();
    await award(env, u.id, ["gardener"]);
    return json(
      {
        mine: view({ kind: body.kind, stage: 0, watered: 0, loc, color: color as number, deco }),
        added: ["gardener"],
      },
      201,
    );
  }
  if (body?.action === "style") {
    if (!mine || !colorOk(body.color) || !isDeco(body.deco)) return json({ error: "invalid" }, 400);
    await env.DB.prepare("UPDATE garden SET color=?, deco=? WHERE user_id=?")
      .bind(body.color, body.deco, u.id)
      .run();
    return json({ mine: view({ ...mine, color: body.color as number, deco: body.deco }) });
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
    const day = dayNumber();
    const exists = await env.DB.prepare("SELECT 1 FROM garden WHERE user_id=?").bind(target).first();
    if (!exists) return json({ error: "not_found" }, 404);
    const today = await env.DB.prepare("SELECT COUNT(*) n FROM garden_gifts WHERE day=? AND user_id=?")
      .bind(day, u.id)
      .first<{ n: number }>();
    if ((today?.n ?? 0) >= GIFTS_PER_DAY) return json({ error: "done" }, 409);
    // One watering per neighbour per day; the primary key makes a second one a no-op.
    const res = await env.DB.prepare("INSERT OR IGNORE INTO garden_gifts(day,user_id,target) VALUES (?,?,?)")
      .bind(day, u.id, target)
      .run();
    if (!res.meta.changes) return json({ error: "already" }, 409);
    await env.DB.prepare("UPDATE garden SET gifts=gifts+1 WHERE user_id=?").bind(target).run();
    return json({ ok: true, giftsLeft: GIFTS_PER_DAY - (today?.n ?? 0) - 1 });
  }
  if (body?.action === "dig") {
    await env.DB.prepare("DELETE FROM garden WHERE user_id=?").bind(u.id).run();
    return json({ mine: null });
  }
  return json({ error: "invalid" }, 400);
};
