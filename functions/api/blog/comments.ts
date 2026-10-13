import { COMMENT_MAX, GUESTBOOK, GUESTBOOK_GAP_MS, GUESTBOOK_MAX, cleanText } from "../../../shared/blog";
import { CARD_MAX, CARD_ICONS, countryOk, parseCard } from "../../../shared/cards";
import { isSpam, scoreComment } from "../../../shared/spam";
import { activeBan, banBody, getSettings, getUser, hashIp, publicUser, requireUser } from "../_blog";
import { Env, geo, json, limit, localDay, notify, trustedCountry } from "../_lib";
import { award } from "../_stamps";
import { reactionsFor } from "./_shared";

type Row = {
  id: number;
  parent_id: number | null;
  reply_to: number | null;
  user_id: string;
  body: string;
  status: string;
  created: number;
  edited: number | null;
  pinned: number;
  card: string | null;
  name: string | null;
  username: string | null;
  picture: string | null;
};

export const toPublic = (r: Row, env: Env, me: string | null) => {
  const gone = r.status === "deleted" || r.status === "hidden";
  const user = publicUser(
    { id: r.user_id, name: r.name ?? "Удалён", username: r.username ?? "", picture: r.picture ?? "" },
    env,
  );
  return {
    id: r.id,
    parent: r.parent_id,
    to: r.reply_to,
    user: gone ? null : user,
    // A comment labelled as possible spam never ships its text: the reader asks for it explicitly.
    body: gone || r.status === "flagged" ? "" : r.body,
    flagged: r.status === "flagged",
    deleted: gone,
    pending: r.status === "pending",
    created: r.created,
    edited: r.edited,
    pinned: r.pinned === 1,
    card: gone ? null : parseCard(r.card),
    own: r.user_id === me,
  };
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const post = Number(new URL(request.url).searchParams.get("post"));
  if (!Number.isInteger(post)) return json({ error: "invalid" }, 400);
  const me = await getUser(request, env);
  const { results } = await env.DB.prepare(
    `SELECT c.id,c.parent_id,c.reply_to,c.user_id,c.body,c.status,c.created,c.edited,c.pinned,c.card,u.name,u.username,u.picture
     FROM comments c LEFT JOIN users u ON u.id=c.user_id
     WHERE c.post_id=?1 AND (c.status IN ('visible','flagged') OR (c.status='pending' AND c.user_id=?2))
     ORDER BY c.created ASC LIMIT 400`,
  )
    .bind(post, me?.id ?? "")
    .all<Row>();
  const { counts, mine } = await reactionsFor(
    env,
    "comment",
    results.map((r) => r.id),
    me?.id ?? null,
  );
  const owners = env.ADMIN_TG_ID.split(",").map((x) => x.trim());
  const byOwner = new Map<number, string[]>();
  if (results.length) {
    const marks = results.map(() => "?").join(",");
    const rows = await env.DB.prepare(
      `SELECT target,emoji,user_id FROM reactions WHERE kind='comment' AND target IN (${marks})`,
    )
      .bind(...results.map((r) => r.id))
      .all<{ target: number; emoji: string; user_id: string }>();
    for (const r of rows.results)
      if (owners.includes(r.user_id)) byOwner.set(r.target, [...(byOwner.get(r.target) ?? []), r.emoji]);
  }
  return json({
    comments: results
      .filter((r) => r.status !== "deleted" && r.status !== "hidden")
      .map((r) => ({
        ...toPublic(r, env, me?.id ?? null),
        reactions: counts.get(r.id) ?? {},
        mine: mine.get(r.id) ?? [],
        byOwner: byOwner.get(r.id) ?? [],
      })),
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const u = await requireUser(request, env);
  if (u instanceof Response) return u;
  const ban = await activeBan(env, u.id, "blog");
  if (ban) return json(banBody(ban), 403);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const postId = Number(body?.post);
  const text = cleanText(body?.body, COMMENT_MAX + 1);
  if (!Number.isInteger(postId) || postId < 0 || !text) return json({ error: "invalid" }, 400);
  if (text.length > COMMENT_MAX) return json({ error: "too_long" }, 413);

  // A postcard is a guestbook entry with a stamp. It is a new thread, never a reply.
  const cardIn = body?.card as { icon?: unknown } | undefined;
  if (cardIn !== undefined) {
    if (
      postId !== GUESTBOOK ||
      body?.parent != null ||
      !(CARD_ICONS as readonly unknown[]).includes(cardIn?.icon)
    )
      return json({ error: "invalid" }, 400);
    if (text.length > CARD_MAX) return json({ error: "too_long" }, 413);
  }

  const settings = await getSettings(env);
  const post =
    postId === GUESTBOOK
      ? { id: GUESTBOOK, title: "Гостевая книга", comments_open: 1 }
      : await env.DB.prepare(
          "SELECT id,title,comments_open FROM posts WHERE id=? AND status='published' AND pub<=?",
        )
          .bind(postId, Date.now())
          .first<{ id: number; title: string; comments_open: number }>();
  if (!post) return json({ error: "not_found" }, 404);
  if (!settings.commentsOpen || !post.comments_open) return json({ error: "closed" }, 403);

  const { ip } = geo(request);
  if (postId === GUESTBOOK && body?.parent == null) {
    const mine = await env.DB.prepare(
      "SELECT COUNT(*) n, MAX(created) last FROM comments WHERE post_id=? AND user_id=? AND parent_id IS NULL AND status!='deleted'",
    )
      .bind(GUESTBOOK, u.id)
      .first<{ n: number; last: number | null }>();
    if ((mine?.n ?? 0) >= GUESTBOOK_MAX) return json({ error: "guestbook" }, 409);
    if (mine?.last && Date.now() - mine.last < GUESTBOOK_GAP_MS) return json({ error: "guestbook_day" }, 429);
  }
  const where = trustedCountry(request, body?.tz) ?? "";
  const card = cardIn ? { icon: cardIn.icon as string, c: countryOk(where) ? where : "" } : null;
  if (!u.owner) {
    if (settings.slowMode && !(await limit(env, `cs:${u.id}`, 1, settings.slowMode)))
      return json({ error: "slow", wait: settings.slowMode }, 429);
    if (!(await limit(env, `cd:${u.id}:${localDay(env)}`, settings.perDay, 86400)))
      return json({ error: "daily" }, 429);
    if (!(await limit(env, `ci:${ip}`, 60, 3600))) return json({ error: "too_many" }, 429);
    const same = await env.DB.prepare(
      "SELECT 1 FROM comments WHERE user_id=? AND body=? AND created>? AND status!='deleted'",
    )
      .bind(u.id, text, Date.now() - 10 * 60_000)
      .first();
    if (same) return json({ error: "duplicate" }, 409);
  }

  // Replies are two levels deep: answering a reply attaches to its parent.
  let parent: number | null = null;
  let replyTo: number | null = null;
  if (body?.parent != null) {
    const p = await env.DB.prepare(
      "SELECT id,parent_id FROM comments WHERE id=? AND post_id=? AND status IN ('visible','flagged','pending')",
    )
      .bind(Number(body.parent), postId)
      .first<{ id: number; parent_id: number | null }>();
    if (!p) return json({ error: "invalid" }, 400);
    parent = p.parent_id ?? p.id;
    replyTo = p.id;
  }

  const copied = !u.owner
    ? !!(await env.DB.prepare("SELECT 1 FROM comments WHERE body=? AND user_id!=? AND created>?")
        .bind(text, u.id, Date.now() - 3600_000)
        .first())
    : false;
  const verdict = u.owner
    ? { score: 0, flags: [] }
    : scoreComment(text, { copied, newUser: Date.now() - u.created < 864e5 });
  let status = isSpam(verdict) ? "flagged" : "visible";
  if (status === "visible" && settings.premod && !u.owner && !u.trusted && !(await hasApproved(env, u.id))) {
    status = "pending";
  }

  const now = Date.now();
  const row = await env.DB.prepare(
    "INSERT INTO comments(post_id,parent_id,reply_to,user_id,body,status,flags,ip_hash,created,card) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id",
  )
    .bind(
      postId,
      parent,
      replyTo,
      u.id,
      text,
      status,
      JSON.stringify(verdict.flags),
      await hashIp(env, ip),
      now,
      card ? JSON.stringify(card) : null,
    )
    .first<{ id: number }>();
  await env.DB.prepare("UPDATE users SET comments=comments+1, seen=? WHERE id=?").bind(now, u.id).run();
  if (postId === GUESTBOOK && status !== "flagged")
    await award(env, u.id, card ? ["postcard", ...(card.c ? [`c:${card.c}`] : [])] : ["guest"]);

  if (!u.owner && (status !== "visible" || (await limit(env, "notify:comment", 6, 3600)))) {
    if (status === "visible" || (await limit(env, "notify:flag", 6, 3600)))
      waitUntil(
        notify(
          env,
          `${status === "flagged" ? "⚠ Возможный спам" : status === "pending" ? "⏳ Ждёт проверки" : "💬 Новый комментарий"} в «${post.title}»\n${u.name}${u.username ? " @" + u.username : ""}: ${text.slice(0, 200)}`,
        ),
      );
  }

  return json(
    {
      comment: {
        id: row!.id,
        parent,
        to: replyTo,
        user: publicUser(u, env),
        body: status === "flagged" ? "" : text,
        flagged: status === "flagged",
        pending: status === "pending",
        deleted: false,
        created: now,
        edited: null,
        pinned: false,
        card: card ? parseCard(card) : null,
        own: true,
        reactions: {},
        mine: [],
        byOwner: [],
      },
      status,
    },
    201,
  );
};

const hasApproved = async (env: Env, userId: string) =>
  !!(await env.DB.prepare("SELECT 1 FROM comments WHERE user_id=? AND status='visible' LIMIT 1")
    .bind(userId)
    .first());
