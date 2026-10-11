import { cleanLine, normalizeSettings } from "../../../shared/blog";
import { banUser, eraseUser, getSettings } from "../_blog";
import { closeThread } from "../blog/_shared";
import { Env, audit, isAdmin, json, requireAdmin } from "../_lib";

type Body = {
  action?: string;
  id?: number;
  user?: string;
  to?: string;
  scope?: string;
  days?: number | null;
  reason?: string;
  purge?: boolean;
  on?: boolean;
  value?: unknown;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const now = Date.now();

  if (request.method === "GET") {
    const q = new URL(request.url).searchParams;
    const tab = q.get("tab");

    if (tab === "comments") {
      const status = q.get("status") ?? "flagged";
      const where =
        status === "reported"
          ? "c.reports>0 AND c.status IN ('visible','flagged')"
          : status === "all"
            ? "1=1"
            : "c.status=?1";
      const before = Number(q.get("before"));
      const stmt = env.DB.prepare(
        `SELECT c.id,c.post_id,c.user_id,c.body,c.status,c.flags,c.reports,c.created,p.title post,u.name,u.username,u.picture,u.comments total,
           EXISTS(SELECT 1 FROM bans b WHERE b.user_id=c.user_id AND b.lifted=0 AND b.scope IN ('blog','all') AND (b.until IS NULL OR b.until>${now})) banned
         FROM comments c LEFT JOIN posts p ON p.id=c.post_id LEFT JOIN users u ON u.id=c.user_id
         WHERE ${where} AND c.created<?2 ORDER BY c.created DESC LIMIT 40`,
      );
      const { results } = await stmt
        .bind(status, Number.isFinite(before) && before > 0 ? before : Number.MAX_SAFE_INTEGER)
        .all<{ flags: string }>();
      return json({ comments: results.map((r) => ({ ...r, flags: JSON.parse(r.flags) })) });
    }

    if (tab === "users") {
      const text = cleanLine(q.get("q"), 40);
      const like = `%${text.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
      const { results } = await env.DB.prepare(
        `SELECT u.id,u.name,u.username,u.picture,u.created,u.seen,u.comments,u.trusted,
           (SELECT COUNT(*) FROM comments c WHERE c.user_id=u.id AND c.status='flagged') flagged,
           (SELECT COUNT(*) FROM presets p WHERE p.user_id=u.id) themes,
           (SELECT scope||'|'||IFNULL(until,0)||'|'||reason FROM bans b WHERE b.user_id=u.id AND b.lifted=0 AND (b.until IS NULL OR b.until>?1) ORDER BY b.id DESC LIMIT 1) ban
         FROM users u ${text ? "WHERE u.name LIKE ?2 ESCAPE '\\' OR u.username LIKE ?2 ESCAPE '\\' OR u.id=?3" : ""}
         ORDER BY u.seen DESC LIMIT 100`,
      )
        .bind(...(text ? [now, like, text] : [now]))
        .all();
      return json({ users: results });
    }

    if (tab === "bans") {
      const { results } = await env.DB.prepare(
        `SELECT b.id,b.user_id,b.scope,b.reason,b.created,b.until,b.lifted,u.name,u.username,u.picture
         FROM bans b LEFT JOIN users u ON u.id=b.user_id ORDER BY b.id DESC LIMIT 200`,
      ).all();
      return json({ bans: results, now });
    }

    const one = async (sql: string) => (await env.DB.prepare(sql).first<{ n: number }>())?.n ?? 0;
    return json({
      counts: {
        flagged: await one("SELECT COUNT(*) n FROM comments WHERE status='flagged'"),
        pending: await one("SELECT COUNT(*) n FROM comments WHERE status='pending'"),
        reported: await one(
          "SELECT COUNT(*) n FROM comments WHERE reports>0 AND status IN ('visible','flagged')",
        ),
        users: await one("SELECT COUNT(*) n FROM users"),
        bans: await one(`SELECT COUNT(*) n FROM bans WHERE lifted=0 AND (until IS NULL OR until>${now})`),
        themes: await one("SELECT COUNT(*) n FROM presets WHERE status='pending'"),
      },
      settings: await getSettings(env),
    });
  }

  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  const b = (await request.json().catch(() => ({}))) as Body;
  const user = String(b.user ?? "");
  const done = async (detail: string) => {
    await audit(env, request, admin.sub, `community_${b.action}`, detail.slice(0, 120));
    return json({ ok: true });
  };

  switch (b.action) {
    case "comment": {
      if (!["visible", "hidden", "deleted", "flagged"].includes(String(b.to)))
        return json({ error: "bad status" }, 400);
      if (b.to === "hidden" || b.to === "deleted") await closeThread(env, Number(b.id), b.to);
      else
        await env.DB.prepare(
          "UPDATE comments SET status=?1, reports=IIF(?1='visible', 0, reports) WHERE id=?2",
        )
          .bind(b.to, Number(b.id))
          .run();
      if (b.to === "visible")
        await env.DB.prepare("DELETE FROM reports WHERE comment_id=?").bind(Number(b.id)).run();
      return done(`${b.id} -> ${b.to}`);
    }
    case "ban": {
      const days = typeof b.days === "number" && b.days > 0 ? b.days : null;
      const err = await banUser(env, {
        user,
        scope: String(b.scope),
        days,
        reason: b.reason,
        purge: !!b.purge,
      });
      if (err) return json({ error: err.error }, err.status as 400);
      return done(`${user} ${b.scope} ${days ?? "forever"}d${b.purge ? " purge" : ""}`);
    }
    case "unban":
      await env.DB.prepare("UPDATE bans SET lifted=1 WHERE user_id=? AND lifted=0 AND (?2='' OR scope=?2)")
        .bind(user, String(b.scope ?? ""))
        .run();
      return done(user);
    case "purge":
      await env.DB.prepare("UPDATE comments SET status='deleted', body='' WHERE user_id=?").bind(user).run();
      return done(user);
    case "trust":
      await env.DB.prepare("UPDATE users SET trusted=? WHERE id=?")
        .bind(b.on ? 1 : 0, user)
        .run();
      return done(`${user} ${b.on}`);
    case "deleteUser":
      if (isAdmin(env, user)) return json({ error: "Владельца нельзя удалить" }, 400);
      await eraseUser(env, user);
      return done(user);
    case "settings": {
      const value = normalizeSettings(b.value);
      await env.DB.prepare(
        "INSERT INTO settings(key,value) VALUES('blog',?1) ON CONFLICT(key) DO UPDATE SET value=?1",
      )
        .bind(JSON.stringify(value))
        .run();
      return done(JSON.stringify(value));
    }
    default:
      return json({ error: "unknown action" }, 400);
  }
};
