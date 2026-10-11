import MarkdownIt from "markdown-it";
type Md = InstanceType<typeof MarkdownIt>;
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import go from "highlight.js/lib/languages/go";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

for (const [n, l] of Object.entries({
  bash,
  css,
  diff,
  go,
  javascript,
  json,
  python,
  rust,
  sql,
  typescript,
  xml,
  yaml,
}))
  hljs.registerLanguage(n, l);
const ALIAS: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  html: "xml",
  py: "python",
  yml: "yaml",
  tsx: "typescript",
  jsx: "javascript",
};

// Everything the Markdown renderer produces goes through DOMPurify as a second wall; raw HTML in the source is off.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("rel", "noopener noreferrer nofollow ugc");
    const href = node.getAttribute("href") ?? "";
    const outside = /^https?:/i.test(href) && new URL(href, location.href).origin !== location.origin;
    if (outside) node.setAttribute("target", "_blank");
    else node.removeAttribute("target");
  }
});

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "") || "section";

// markdown-it's text rule does not stop at "|", which would swallow ||spoilers||; this copy adds it.
const STOP = new Set([
  10, 33, 35, 36, 37, 38, 42, 43, 45, 58, 60, 61, 62, 64, 91, 92, 93, 94, 95, 96, 123, 124, 125, 126,
]);
function stopAtPipe(md: Md) {
  md.inline.ruler.at("text", (state, silent) => {
    let pos = state.pos;
    while (pos < state.posMax && !STOP.has(state.src.charCodeAt(pos))) pos++;
    if (pos === state.pos) return false;
    if (!silent) state.pending += state.src.slice(state.pos, pos);
    state.pos = pos;
    return true;
  });
}

function pair(md: Md, name: string, mark: string, tag: string, cls = "") {
  md.inline.ruler.before("emphasis", name, (state, silent) => {
    const { src, pos } = state;
    if (!src.startsWith(mark, pos)) return false;
    const end = src.indexOf(mark, pos + mark.length);
    if (end < 0 || end === pos + mark.length) return false;
    if (!silent) {
      const open = state.push(`${name}_open`, tag, 1);
      if (cls) open.attrSet("class", cls);
      const text = state.push("text", "", 0);
      text.content = src.slice(pos + mark.length, end);
      state.push(`${name}_close`, tag, -1);
    }
    state.pos = end + mark.length;
    return true;
  });
}

const CALLOUT = /^\[!(NOTE|TIP|WARNING|IMPORTANT|QUOTE)\]\s*/i;
const LABEL: Record<string, string> = {
  NOTE: "Заметка",
  TIP: "Совет",
  WARNING: "Внимание",
  IMPORTANT: "Важно",
  QUOTE: "Цитата",
};

function callouts(md: Md) {
  md.core.ruler.push("callouts", (state) => {
    const t = state.tokens;
    for (let i = 0; i < t.length - 2; i++) {
      if (t[i].type !== "blockquote_open" || t[i + 1].type !== "paragraph_open" || t[i + 2].type !== "inline")
        continue;
      const m = CALLOUT.exec(t[i + 2].content);
      if (!m) continue;
      const kind = m[1].toUpperCase();
      t[i].attrJoin("class", `callout ${kind.toLowerCase()}`);
      t[i].attrSet("data-label", LABEL[kind]);
      t[i + 2].content = t[i + 2].content.slice(m[0].length);
      const first = t[i + 2].children?.[0];
      if (first?.type === "text") first.content = first.content.replace(CALLOUT, "");
      const kids = t[i + 2].children;
      if (kids && first?.content === "" && kids[1]?.type === "softbreak") kids.splice(1, 1);
    }
  });
}

function headings(md: Md) {
  md.core.ruler.push("heading_ids", (state) => {
    const used = new Map<string, number>();
    const toc: { level: number; id: string; text: string }[] = [];
    state.tokens.forEach((tok, i) => {
      if (tok.type !== "heading_open") return;
      const text = state.tokens[i + 1].content;
      let id = slug(text);
      const n = used.get(id) ?? 0;
      used.set(id, n + 1);
      if (n) id += `-${n}`;
      tok.attrSet("id", id);
      toc.push({ level: Number(tok.tag.slice(1)), id, text });
    });
    (state.env as { toc?: typeof toc }).toc = toc;
  });
}

function images(md: Md) {
  md.renderer.rules.image = (tokens, i) => {
    const t = tokens[i];
    const alt = md.utils.escapeHtml(t.content);
    const src = md.utils.escapeHtml(String(t.attrGet("src") ?? ""));
    const cap = t.attrGet("title") as string | null;
    return `<span class="fig"><img src="${src}" alt="${alt}" loading="lazy" decoding="async" referrerpolicy="no-referrer">${cap ? `<em>${md.utils.escapeHtml(cap)}</em>` : ""}</span>`;
  };
}

function build() {
  const md: Md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    breaks: true,
    highlight(code, lang) {
      const l = ALIAS[lang] ?? lang;
      const body =
        l && hljs.getLanguage(l)
          ? hljs.highlight(code, { language: l, ignoreIllegals: true }).value
          : md.utils.escapeHtml(code);
      return `<pre class="code"><span class="lang">${md.utils.escapeHtml(lang || "text")}</span><code class="hljs">${body}</code></pre>`;
    },
  });
  stopAtPipe(md);
  pair(md, "spoiler", "||", "span", "spoiler");
  pair(md, "mark", "==", "mark");
  callouts(md);
  headings(md);
  images(md);
  return md;
}

let post: Md | undefined;
let note: Md | undefined;

export type Toc = { level: number; id: string; text: string }[];

export function renderPost(src: string): { html: string; toc: Toc } {
  post ??= build();
  const env: { toc?: Toc } = {};
  const raw = post.render(src, env);
  const html = DOMPurify.sanitize(raw, { ADD_ATTR: ["target", "data-label"] });
  return { html, toc: env.toc ?? [] };
}

export function renderComment(src: string, links = true): string {
  if (!note) {
    note = new MarkdownIt({ html: false, linkify: true, breaks: true, typographer: false });
    note.disable(["image", "heading", "lheading", "table", "hr", "html_block", "reference"]);
    stopAtPipe(note);
    pair(note, "spoiler", "||", "span", "spoiler");
  }
  return DOMPurify.sanitize(note.render(src), {
    ADD_ATTR: ["target"],
    FORBID_TAGS: links ? [] : ["a"],
    KEEP_CONTENT: true,
  });
}
