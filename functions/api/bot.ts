import { NOW_PRESETS, NOW_TEXT_MAX } from "../../shared/now";
import { Env, isAdmin, json } from "./_lib";
import { setNow } from "./now";

type Update = {
  message?: { text?: string; chat: { id: number }; from?: { id: number } };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number };
    message?: { chat: { id: number }; message_id: number };
  };
};

const tg = async (env: Env, method: string, body: object) => {
  try {
    await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // the status is already saved, a failed reply only costs the confirmation
  }
};

const menu = () => ({
  inline_keyboard: [
    ...Array.from({ length: Math.ceil(NOW_PRESETS.length / 2) }, (_, i) =>
      NOW_PRESETS.slice(i * 2, i * 2 + 2).map((p) => ({
        text: `${p.icon} ${p.ru}`,
        callback_data: `now:${p.id}`,
      })),
    ),
    [{ text: "✖ Убрать статус", callback_data: "now:clear" }],
  ],
});

const apply = async (env: Env, id: string): Promise<string> => {
  if (id === "clear") {
    await setNow(env, null);
    return "Статус убран";
  }
  const p = NOW_PRESETS.find((x) => x.id === id);
  if (!p) return "Нет такого статуса";
  await setNow(env, { icon: p.icon, ru: p.ru, en: p.en, ts: Date.now() });
  return `Статус: ${p.icon} ${p.ru}`;
};

// Telegram webhook. Only the owner is heard: /now opens the choices, /now some text sets a custom status.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const secret = env.BOT_SECRET;
  if (!secret || !env.TG_BOT_TOKEN) return json({ error: "not_found" }, 404);
  if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== secret)
    return json({ error: "forbidden" }, 403);
  const update = (await request.json().catch(() => null)) as Update | null;
  if (!update) return json({ ok: true });

  const cb = update.callback_query;
  if (cb?.data?.startsWith("now:") && isAdmin(env, String(cb.from.id))) {
    const text = await apply(env, cb.data.slice(4));
    await tg(env, "answerCallbackQuery", { callback_query_id: cb.id, text });
    if (cb.message) await tg(env, "sendMessage", { chat_id: cb.message.chat.id, text });
    return json({ ok: true });
  }

  const m = update.message;
  if (m?.text && m.from && isAdmin(env, String(m.from.id))) {
    const [cmd = "", ...rest] = m.text.trim().split(/\s+/);
    const command = cmd.split("@")[0];
    const free = rest.join(" ").slice(0, NOW_TEXT_MAX);
    if (command === "/now" && free) {
      await setNow(env, { icon: "✨", ru: free, en: free, ts: Date.now() });
      await tg(env, "sendMessage", { chat_id: m.chat.id, text: `Статус: ✨ ${free}` });
    } else if (command === "/now" || command === "/start") {
      await tg(env, "sendMessage", {
        chat_id: m.chat.id,
        text: "Что сейчас происходит? Выбери или напиши /now и свой текст.",
        reply_markup: menu(),
      });
    } else if (command === "/clear") {
      await tg(env, "sendMessage", { chat_id: m.chat.id, text: await apply(env, "clear") });
    }
  }
  return json({ ok: true });
};
