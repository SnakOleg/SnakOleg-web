import type { ComponentChildren } from "preact";

// Inline Markdown for post teasers, rendered as nodes so nothing from the post reaches innerHTML.
const INLINE =
  /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3|~~(.+?)~~|\|\|(.+?)\|\||==(.+?)==|`([^`]+)`|\[([^\]]+)\]\([^)]*\)/;

function inline(src: string): ComponentChildren[] {
  const out: ComponentChildren[] = [];
  let rest = src;
  for (let m = INLINE.exec(rest); m; m = INLINE.exec(rest)) {
    if (m.index) out.push(rest.slice(0, m.index));
    if (m[2] !== undefined) out.push(<b>{inline(m[2])}</b>);
    else if (m[4] !== undefined) out.push(<i>{inline(m[4])}</i>);
    else if (m[5] !== undefined) out.push(<s>{inline(m[5])}</s>);
    else if (m[6] !== undefined) out.push(<span class="tspoil">{inline(m[6])}</span>);
    else if (m[7] !== undefined) out.push(<mark>{inline(m[7])}</mark>);
    else if (m[8] !== undefined) out.push(<code>{m[8]}</code>);
    else out.push(<u>{inline(m[9]!)}</u>);
    rest = rest.slice(m.index + m[0].length);
  }
  if (rest) out.push(rest);
  return out;
}

const UL = /^\s*[-*+]\s+/;
const OL = /^\s*\d+[.)]\s+/;

export function Teaser({ src, class: cls = "" }: { src: string; class?: string }) {
  const blocks: ComponentChildren[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const items = list.items.map((x) => <li>{inline(x)}</li>);
    blocks.push(list.ordered ? <ol>{items}</ol> : <ul>{items}</ul>);
    list = null;
  };
  for (const line of src.split("\n")) {
    const ordered = OL.test(line);
    if (ordered || UL.test(line)) {
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push(line.replace(ordered ? OL : UL, ""));
      continue;
    }
    flush();
    blocks.push(<p>{inline(line)}</p>);
  }
  flush();
  return <div class={`teaser ${cls}`}>{blocks}</div>;
}
