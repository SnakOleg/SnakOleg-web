import type { ComponentChildren } from "preact";

export function Note({ text }: { text: string }) {
  return (
    <span class="note">
      <button type="button" class="q" aria-label="Пояснение">
        ?
      </button>
      <span class="tip" role="note">
        {text}
      </span>
    </span>
  );
}

type CardProps = {
  title: string;
  note?: string;
  children: ComponentChildren;
  class?: string;
  actions?: ComponentChildren;
};

export function Card({ title, note, children, class: cls = "", actions }: CardProps) {
  return (
    <section class={`card ${cls}`}>
      <header class="ch">
        <h2>{title}</h2>
        {note && <Note text={note} />}
        <span class="sp" />
        {actions}
      </header>
      {children}
    </section>
  );
}
