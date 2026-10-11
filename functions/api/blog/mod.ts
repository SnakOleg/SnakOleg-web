import { banUser, requireUser } from "../_blog";
import { Env, audit, json } from "../_lib";
import { closeThread } from "./_shared";

type Body = {
  action?: string;
  comment?: number;
  to?: string;
  user?: string;
  days?: number | null;
  reason?: string;
  purge?: boolean;
  scope?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (u instanceof Response) return u;
  if (!u.owner) return json({ error: "forbidden" }, 403);
  const b = (await request.json().catch(() => ({}))) as Body;

  switch (b.action) {
    case "comment": {
      if (!["visible", "hidden", "deleted"].includes(String(b.to))) return json({ error: "invalid" }, 400);
      if (b.to === "visible")
        await env.DB.prepare("UPDATE comments SET status='visible', reports=0 WHERE id=?")
          .bind(Number(b.comment))
          .run();
      else await closeThread(env, Number(b.comment), b.to as "hidden" | "deleted");
      if (b.to === "visible")
        await env.DB.prepare("DELETE FROM reports WHERE comment_id=?").bind(Number(b.comment)).run();
      await audit(env, request, u.id, "mod_comment", `${b.comment} -> ${b.to}`);
      return json({ ok: true });
    }
    case "ban": {
      const days = typeof b.days === "number" && b.days > 0 ? b.days : null;
      const err = await banUser(env, {
        user: String(b.user ?? ""),
        scope: b.scope ?? "blog",
        days,
        reason: b.reason,
        purge: !!b.purge,
      });
      if (err) return json({ error: err.error }, err.status as 400);
      await audit(env, request, u.id, "mod_ban", `${b.user} ${days ?? "forever"}d`);
      return json({ ok: true });
    }
    case "unban":
      await env.DB.prepare("UPDATE bans SET lifted=1 WHERE user_id=? AND lifted=0")
        .bind(String(b.user ?? ""))
        .run();
      await audit(env, request, u.id, "mod_unban", String(b.user));
      return json({ ok: true });
    default:
      return json({ error: "invalid" }, 400);
  }
};
