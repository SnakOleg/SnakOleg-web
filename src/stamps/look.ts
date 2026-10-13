import { stampDef } from "../../shared/stamps";
import type { Frame } from "../../shared/stamps";
import type { L } from "../lib/i18n";

export type Look = { icon: string; frame: Frame; hue: number; title: string; hint: string; sub?: string };

const SEASONS = {
  newyear: { icon: "tree", hue: 150, ru: "Новый год", en: "New Year" },
  halloween: { icon: "pumpkin", hue: 28, ru: "Хэллоуин", en: "Halloween" },
  valentine: { icon: "heart", hue: 345, ru: "День влюблённых", en: "Valentine's Day" },
};

export function lookOf(code: string, l: L): Look | null {
  const def = stampDef(code);
  if (def) {
    const [title, hint] = def[l];
    return { icon: def.icon, frame: def.frame, hue: def.hue, title, hint };
  }
  if (code.startsWith("c:")) {
    const cc = code.slice(2);
    let name = cc;
    try {
      name = new Intl.DisplayNames([l], { type: "region" }).of(cc) ?? cc;
    } catch {
      // unknown region code
    }
    return {
      icon: cc,
      frame: "postmark",
      hue: (cc.charCodeAt(0) * 7 + cc.charCodeAt(1) * 13) % 360,
      title: name,
      hint: l === "ru" ? "Заходи на сайт из разных стран" : "Visit the site from different countries",
      sub: name.length > 12 ? cc : name,
    };
  }
  const m = /^s:(newyear|halloween|valentine):(\d{4})$/.exec(code);
  if (m) {
    const s = SEASONS[m[1] as keyof typeof SEASONS];
    return { icon: s.icon, frame: "rosette", hue: s.hue, title: s[l], hint: "", sub: m[2] };
  }
  return null;
}
