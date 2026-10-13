import { useEffect, useRef, useState } from "preact/hooks";
import type { L } from "../lib/i18n";
import type { Theme } from "../hooks/useTheme";
import { currentMe } from "../blog/api";
import { found } from "../stamps/client";
import { SKIES } from "../weather/prefs";
import type { Sky, WxPrefs } from "../weather/prefs";
import { NAMES, run } from "./commands";
import type { Ctx, Line } from "./commands";
import { HOME, list, resolve, show } from "./fs";
import { text } from "./text";
import "./terminal.scss";

export const TERMINAL_EVENT = "snak-terminal";
export const openTerminal = () => dispatchEvent(new Event(TERMINAL_EVENT));

const VIM = ["~", "~       VIM - Vi IMproved", "~", "~       type  :q  and press Enter to exit", "~", "~"];

type Props = {
  l: L;
  setL: (l: L) => void;
  th: Theme;
  setTh: (t: Theme) => void;
  wx: WxPrefs;
  setWx: (p: WxPrefs) => void;
  retro: boolean;
  setRetro: (v: boolean) => void;
  earned: () => number;
};

export function Terminal({ l, setL, th, setTh, wx, setWx, retro, setRetro, earned }: Props) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [value, setValue] = useState("");
  const [cwd, setCwd] = useState(HOME);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const out = useRef<HTMLDivElement>(null);
  const hist = useRef<string[]>([]);
  const pos = useRef(0);
  const vimMode = useRef<"off" | "normal">("off");
  const alive = useRef(true);
  const latest = useRef({ l, th, wx, retro });
  latest.current = { l, th, wx, retro };

  useEffect(() => {
    alive.current = true;
    return () => void (alive.current = false);
  }, []);

  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    const key = (e: KeyboardEvent) => {
      if (e.code !== "Backquote" || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      toggle();
    };
    addEventListener(TERMINAL_EVENT, toggle);
    addEventListener("keydown", key);
    return () => {
      removeEventListener(TERMINAL_EVENT, toggle);
      removeEventListener("keydown", key);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    found("terminal");
    if (!lines.length) setLines([text(l).welcome]);
    input.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open]);

  useEffect(() => {
    out.current?.scrollTo({ top: out.current.scrollHeight });
  }, [lines]);

  const print = (add: Line | Line[]) => setLines((cur) => cur.concat(add).slice(-300));

  const ctx = (): Ctx => ({
    l: latest.current.l,
    user: currentMe()?.user?.name ?? "guest",
    cwd,
    history: hist.current,
    earned,
    print,
    later: async (add, ms) => {
      for (const x of add) {
        if (!alive.current) return;
        print(x);
        await new Promise((r) => setTimeout(r, ms));
      }
    },
    setCwd,
    clear: () => setLines([]),
    close: () => setOpen(false),
    vim: () => {
      setLines((cur) => cur.concat(VIM));
      vimMode.current = "normal";
    },
    setTheme: (mode) => setTh({ ...latest.current.th, mode }),
    setLang: setL,
    setSky: (s) => {
      if (!(SKIES as readonly string[]).includes(s)) return false;
      setWx({ ...latest.current.wx, sky: s as Sky });
      return true;
    },
    toggleRetro: () => {
      setRetro(!latest.current.retro);
      return !latest.current.retro;
    },
    go: (href) => {
      setOpen(false);
      location.assign(href);
    },
  });

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    const raw = value;
    setValue("");
    print(`${prompt()} ${raw}`);
    if (raw.trim()) {
      hist.current.push(raw.trim());
      pos.current = hist.current.length;
    }
    if (vimMode.current === "normal") {
      const cmd = raw.trim();
      if (cmd === ":q") print("E37: No write since last change (add ! to override)");
      else if (/^(:q!|:wq|:x|ZZ)$/.test(cmd)) {
        vimMode.current = "off";
        print("");
        found("vim");
      } else if (cmd === "i") print("-- INSERT -- (Esc is stuck. Try :q)");
      else if (cmd) print(`E492: Not an editor command: ${cmd}`);
      return;
    }
    setBusy(true);
    try {
      await run(raw, ctx());
    } finally {
      if (alive.current) {
        setBusy(false);
        setTimeout(() => input.current?.focus(), 0);
      }
    }
  };

  const prompt = () =>
    `${(currentMe()?.user?.name ?? "guest").toLowerCase().replace(/\s+/g, "")}@snak:${show(cwd)}$`;

  const complete = () => {
    const parts = value.split(/\s+/);
    const last = parts[parts.length - 1] ?? "";
    if (parts.length === 1) {
      const hit = NAMES.filter((n) => n.startsWith(last));
      if (hit.length === 1) setValue(hit[0] + " ");
      else if (hit.length > 1) print(hit.join("  "));
      return;
    }
    const slash = last.lastIndexOf("/");
    const dir = resolve(cwd, slash >= 0 ? last.slice(0, slash + 1) || "/" : "");
    const base = slash >= 0 ? last.slice(slash + 1) : last;
    const hit = list(dir, base.startsWith(".")).filter((n) => n.startsWith(base));
    if (hit.length === 1) setValue(value.slice(0, value.length - base.length) + hit[0]);
    else if (hit.length > 1) print(hit.join("  "));
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.code === "Backquote" && !value) {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      pos.current = Math.max(0, pos.current - 1);
      setValue(hist.current[pos.current] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      pos.current = Math.min(hist.current.length, pos.current + 1);
      setValue(hist.current[pos.current] ?? "");
    } else if (e.key === "Tab") {
      e.preventDefault();
      complete();
    } else if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      setLines([]);
    } else if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      print(`${prompt()} ${value}^C`);
      setValue("");
    }
  };

  if (!open) return null;
  return (
    <div
      class="term"
      role="dialog"
      aria-label="Terminal"
      onClick={() => !getSelection()?.toString() && input.current?.focus()}
    >
      <div class="tbar">
        <span>{prompt().replace("$", "")}</span>
        <button type="button" aria-label="Close" onClick={() => setOpen(false)}>
          ×
        </button>
      </div>
      <div class="tout" ref={out} role="log" aria-live="polite">
        {lines.map((x) => {
          const t = typeof x === "string" ? x : x.t;
          const c = typeof x === "string" ? "" : (x.c ?? "");
          return <pre class={c}>{t || " "}</pre>;
        })}
      </div>
      <form class="tin" onSubmit={(e) => void submit(e)}>
        <label for="term-input">{prompt()}</label>
        <input
          id="term-input"
          ref={input}
          value={value}
          disabled={busy}
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
          onInput={(e) => setValue((e.target as HTMLInputElement).value)}
          onKeyDown={onKey}
        />
      </form>
    </div>
  );
}
