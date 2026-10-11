import { useEffect, useMemo, useRef, useState } from "preact/hooks";

export type Command = { id: string; label: string; hint?: string; run: () => void | Promise<void> };

export function Palette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return commands.filter((c) => !q || `${c.label} ${c.hint ?? ""}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => input.current?.focus(), []);
  useEffect(() => setIndex(0), [query]);

  const run = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    void c.run();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(list.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") run(list[index]);
  };

  return (
    <div class="modal top" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="pal" role="dialog" aria-modal="true" aria-label="Быстрые действия">
        <input
          ref={input}
          value={query}
          placeholder="Куда перейти или что сделать"
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          onKeyDown={onKey}
        />
        <ul>
          {list.map((c, i) => (
            <li>
              <button
                type="button"
                class={i === index ? "on" : ""}
                onMouseEnter={() => setIndex(i)}
                onClick={() => run(c)}
              >
                <span>{c.label}</span>
                {c.hint && <small>{c.hint}</small>}
              </button>
            </li>
          ))}
          {!list.length && <li class="none">Ничего не найдено</li>}
        </ul>
      </div>
    </div>
  );
}
