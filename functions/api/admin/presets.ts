import { cleanLine } from "../../../shared/blog";
import { Env, audit, json, requireAdmin } from "../_lib";

type Body = { action?: string; id?: number; name?: string; author?: string; comment?: string };

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT p.id,p.name,p.author,p.comment,p.palette,p.status,p.created,p.user_id,u.name uname,u.username,u.picture,
        EXISTS(SELECT 1 FROM bans b WHERE b.user_id=p.user_id AND b.lifted=0 AND b.scope IN ('themes','all') AND (b.until IS NULL OR b.until>${Date.now()})) banned
       FROM presets p LEFT JOIN users u ON u.id=p.user_id ORDER BY p.id DESC LIMIT 300`,
    ).all<{ palette: string }>();
    const theme = await env.DB.prepare("SELECT value FROM content WHERE key='theme'").first<{
      value: string;
    }>();
    return json({
      presets: results.map((r) => ({ ...r, palette: JSON.parse(r.palette) })),
      accepting: !theme || JSON.parse(theme.value).presets !== false,
      limits: { pending: 100, total: 300, perHour: 5 },
    });
  }

  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  const body = (await request.json().catch(() => ({}))) as Body;
  const id = Number(body.id);
  const row = await env.DB.prepare("SELECT id,name FROM presets WHERE id=?")
    .bind(id)
    .first<{ id: number; name: string }>();
  if (!row) return json({ error: "Тема не найдена" }, 404);

  const edit = async () => {
    if (body.name === undefined && body.author === undefined && body.comment === undefined) return;
    const name = cleanLine(body.name, 30);
    if (name.length < 2) throw new Error("Название слишком короткое");
    await env.DB.prepare("UPDATE presets SET name=?, author=?, comment=? WHERE id=?")
      .bind(name, cleanLine(body.author, 30) || "Аноним", cleanLine(body.comment, 140), id)
      .run();
  };

  try {
    switch (body.action) {
      case "approve":
        await edit();
        await env.DB.prepare("UPDATE presets SET status='approved' WHERE id=?").bind(id).run();
        break;
      case "reject":
        await env.DB.prepare("UPDATE presets SET status='rejected' WHERE id=?").bind(id).run();
        break;
      case "delete":
        await env.DB.prepare("DELETE FROM presets WHERE id=?").bind(id).run();
        break;
      case "update":
        await edit();
        break;
      default:
        return json({ error: "unknown action" }, 400);
    }
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }
  await audit(env, request, admin.sub, `preset_${body.action}`, `${id} ${row.name}`.slice(0, 80));
  return json({ ok: true });
};
