import {
  USER_COOKIE_DELETE,
  activeBan,
  eraseUser,
  getSettings,
  getUser,
  publicUser,
  requireUser,
} from "../_blog";
import { Env, json } from "../_lib";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getUser(request, env);
  const settings = await getSettings(env);
  const pub = {
    commentsOpen: settings.commentsOpen,
    slowMode: settings.slowMode,
    themesOpen: settings.themesOpen,
  };
  if (!user) return json({ user: null, settings: pub });
  const [blog, themes] = await Promise.all([
    activeBan(env, user.id, "blog"),
    activeBan(env, user.id, "themes"),
  ]);
  return json({
    user: { ...publicUser(user, env), owner: user.owner },
    bans: {
      blog: blog && { reason: blog.reason, until: blog.until },
      themes: themes && { reason: themes.reason, until: themes.until },
    },
    settings: pub,
  });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (u instanceof Response) return u;
  await eraseUser(env, u.id);
  return json({ ok: true }, 200, { "Set-Cookie": USER_COOKIE_DELETE });
};
