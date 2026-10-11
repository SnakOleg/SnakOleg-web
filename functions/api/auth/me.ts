import { Env, json, requireAdmin } from "../_lib";
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const a = await requireAdmin(request, env);
  return a instanceof Response ? a : json({ name: a.name, id: a.sub });
};
