import { ask } from "./dialogs";

type Guard = { dirty: boolean; save: (() => Promise<boolean>) | null };

const state: Guard = { dirty: false, save: null };

export const setGuard = (patch: Partial<Guard>) => Object.assign(state, patch);

export const isDirty = () => state.dirty;

export async function leave(): Promise<boolean> {
  if (!state.dirty) return true;
  const answer = await ask({
    title: "Есть несохранённые изменения",
    text: "Если уйти сейчас, правки пропадут. Сохранить их перед уходом?",
    ok: "Сохранить и уйти",
    third: "Уйти без сохранения",
    cancel: "Остаться",
  });
  if (answer === "cancel") return false;
  if (answer === "ok" && !(await state.save?.())) return false;
  state.dirty = false;
  return true;
}
