import { useState } from "preact/hooks";
import { site } from "../config";
import { tx } from "../lib/i18n";
import type { L } from "../lib/i18n";
import { Ico } from "./ui/Icon";

export function Contacts({ l }: { l: L }) {
  const u = site.ui[l];
  const [copied, setCopied] = useState(-1);

  const copy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      setTimeout(() => setCopied(-1), 1600);
    } catch {
      // clipboard access can be blocked
    }
  };

  return (
    <ul class="contacts">
      <li class="rv">
        <a href={site.waka.url}>
          <Ico n="clock" />
          {tx(site.waka.text, l)}
        </a>
      </li>
      {site.contacts.map((c, i) => (
        <li class={`rv${c.copy ? " pair" : ""}`} style={{ "--i": i + 1 }}>
          <a href={c.href}>
            <Ico n={c.icon} />
            {tx(c.label, l)}
          </a>
          {c.copy && (
            <button
              type="button"
              class="cp"
              title={copied === i ? u.copied : u.copy}
              aria-label={copied === i ? u.copied : u.copy}
              onClick={() => void copy(c.copy!, i)}
            >
              <Ico n={copied === i ? "check" : "copy"} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
