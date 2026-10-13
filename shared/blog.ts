// Blog constants and small helpers shared by the API and the site.
export const EMOJI = ["👍", "❤️", "🔥", "😂", "🎉", "🤔"] as const;
export const MAX_REACTIONS_PER_TARGET = 3;
export const COMMENT_MAX = 1000;
export const EDIT_WINDOW_MS = 15 * 60_000;
export const REPORTS_TO_FLAG = 3;

export type BlogSettings = {
  /** master switch for new comments */
  commentsOpen: boolean;
  /** seconds a user must wait between comments */
  slowMode: number;
  /** hold the first comments of new users until the owner approves them */
  premod: boolean;
  /** comments per user per day */
  perDay: number;
  /** theme suggestions: accepting, and how many per user per day */
  themesOpen: boolean;
  themesPerDay: number;
};

export const DEFAULT_SETTINGS: BlogSettings = {
  commentsOpen: true,
  slowMode: 10,
  premod: false,
  perDay: 40,
  themesOpen: true,
  themesPerDay: 3,
};

const num = (v: unknown, min: number, max: number, d: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d;

export function normalizeSettings(v: unknown): BlogSettings {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    commentsOpen: typeof o.commentsOpen === "boolean" ? o.commentsOpen : d.commentsOpen,
    slowMode: num(o.slowMode, 0, 600, d.slowMode),
    premod: typeof o.premod === "boolean" ? o.premod : d.premod,
    perDay: num(o.perDay, 1, 500, d.perDay),
    themesOpen: typeof o.themesOpen === "boolean" ? o.themesOpen : d.themesOpen,
    themesPerDay: num(o.themesPerDay, 1, 50, d.themesPerDay),
  };
}

/** Plain text taken from Markdown, for excerpts, search and the RSS feed. */
export function plainText(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^>\s*\[![A-Za-z]+\]\s*/gm, "")
    .replace(/[#>*_`~|=]/g, "")
    .replace(/\|\|/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Comments with this post id belong to the guestbook, not to a post. */
export const GUESTBOOK = 0;
export const GUESTBOOK_MAX = 3;
export const GUESTBOOK_GAP_MS = 20 * 3_600_000;
export const MAX_PINNED = 3;

// A short Markdown teaser: paragraphs and lists with inline formatting, no headings, code blocks, images or tables.
export function excerptOf(md: string, max = 260) {
  const lines = md
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .split("\n")
    .map((x) =>
      x
        .replace(/^>\s*\[![A-Za-z]+\]\s*/, "")
        .replace(/^>\s?/, "")
        .trimEnd(),
    )
    .filter((x) => x.trim() && !/^\s*(#{1,6}\s|\||-{3,}|\*{3,})/.test(x));
  const out: string[] = [];
  let size = 0;
  for (const line of lines) {
    if (size + line.length > max) {
      const room = max - size;
      if (room > 40) out.push(line.slice(0, room).replace(/\s+\S*$/, "") + "…");
      else if (out.length) out[out.length - 1] += "…";
      break;
    }
    out.push(line);
    size += line.length;
  }
  return out.join("\n");
}

export const readMinutes = (md: string) =>
  Math.max(1, Math.round((plainText(md).match(/\S+/g)?.length ?? 0) / 200));

/** Comment/post text: no control characters, normalised newlines, no more than two blank lines. */
export const cleanText = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f​-‏‪-‮⁦-⁩]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);

/** One line of plain text: control characters and angle brackets dropped, spaces collapsed. */
export const cleanLine = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u001f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
