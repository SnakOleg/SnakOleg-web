import type { Env } from "./_lib";

export const award = (env: Env, userId: string, codes: string[]) =>
  codes.length
    ? env.DB.batch(
        codes.map((c) =>
          env.DB.prepare("INSERT OR IGNORE INTO stamps(user_id,code,created) VALUES (?,?,?)").bind(
            userId,
            c,
            Date.now(),
          ),
        ),
      )
    : Promise.resolve([]);
