import { Env, json } from "./_lib";

export const onRequest: PagesFunction<Env> = async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    console.error(error);
    return json({ error: "server_error" }, 500);
  }
};
