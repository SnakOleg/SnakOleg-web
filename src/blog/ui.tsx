import { useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { Ico } from "../components/ui/Icon";
import type { L } from "../lib/i18n";
import { DEMO, loginUrl, refreshMe, removeAccount, signOut, useMe } from "./api";
import type { BanInfo, CUser } from "./api";
import { strings, dateOf } from "./strings";

const listeners = new Set<() => void>();
export const here = () => location.pathname + location.search;
export function go(to: string, keepScroll = false) {
  if (to === here()) return;
  history.pushState(null, "", to);
  listeners.forEach((f) => f());
  if (!keepScroll) scrollTo({ top: 0 });
}
export function usePath() {
  const [p, setP] = useState(here);
  useEffect(() => {
    const f = () => setP(here());
    listeners.add(f);
    addEventListener("popstate", f);
    return () => {
      listeners.delete(f);
      removeEventListener("popstate", f);
    };
  }, []);
  return p;
}
export function Link({
  to,
  children,
  ...rest
}: {
  to: string;
  children: ComponentChildren;
  class?: string;
  "aria-label"?: string;
  keep?: boolean;
}) {
  const { keep, ...attrs } = rest;
  return (
    <a
      href={to}
      {...attrs}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        go(to, keep);
      }}
    >
      {children}
    </a>
  );
}

const refreshers = new Set<() => void>();
export const refreshBlog = () => refreshers.forEach((f) => f());
export function useRefresh(f: () => void) {
  useEffect(() => {
    refreshers.add(f);
    return () => void refreshers.delete(f);
  });
}

let editorOpener: ((id: number) => void) | null = null;
export const setEditorOpener = (f: ((id: number) => void) | null) => {
  editorOpener = f;
};
export const openEditor = (id = 0) => editorOpener?.(id);

export function useDismiss<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => ref.current && !ref.current.contains(e.target as Node) && close();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("pointerdown", away);
    addEventListener("keydown", esc);
    return () => {
      removeEventListener("pointerdown", away);
      removeEventListener("keydown", esc);
    };
  }, [open]);
  return ref;
}

export type MenuItem = { label: string; icon: string; run: () => void; danger?: boolean };

export function Menu({ items, l }: { items: (MenuItem | false)[]; l: L }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const list = items.filter((x): x is MenuItem => !!x);
  if (!list.length) return null;
  return (
    <div class="menu" ref={ref}>
      <button
        type="button"
        class="act more"
        aria-label={strings(l).menu}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Ico n="more" />
      </button>
      {open && (
        <div class="sheet" role="menu">
          {list.map((it) => (
            <button
              type="button"
              role="menuitem"
              class={it.danger ? "dng" : ""}
              onClick={() => {
                setOpen(false);
                it.run();
              }}
            >
              <Ico n={it.icon} />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const toasts = new Set<(t: string) => void>();
export const toast = (t: string) => toasts.forEach((f) => f(t));
export function Toasts() {
  const [t, setT] = useState("");
  useEffect(() => {
    let id = 0;
    const f = (x: string) => {
      setT(x);
      clearTimeout(id);
      id = window.setTimeout(() => setT(""), 2600);
    };
    toasts.add(f);
    return () => void toasts.delete(f);
  }, []);
  return (
    <div class="toast" role="status" aria-live="polite">
      {t && <span>{t}</span>}
    </div>
  );
}

type Ask = { text: string; yes: string; danger: boolean; done: (v: boolean) => void };
let askHost: ((a: Ask) => void) | null = null;

export const ask = (text: string, yes: string, danger = true) =>
  new Promise<boolean>((done) => (askHost ? askHost({ text, yes, danger, done }) : done(false)));

export function AskHost({ l }: { l: L }) {
  const [a, setA] = useState<Ask | null>(null);
  useEffect(() => {
    askHost = setA;
    return () => void (askHost = null);
  }, []);
  const close = (v: boolean) => {
    a?.done(v);
    setA(null);
  };
  useEffect(() => {
    if (!a) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [a]);
  if (!a) return null;
  return (
    <div class="modback" onClick={(e) => e.target === e.currentTarget && close(false)}>
      <div class="moddlg ask" role="alertdialog" aria-modal="true" aria-label={a.text}>
        <p>{a.text}</p>
        <div class="row">
          <button type="button" class="link" onClick={() => close(false)}>
            {strings(l).cancel}
          </button>
          <button
            type="button"
            class={`btn${a.danger ? " danger" : ""}`}
            autofocus
            onClick={() => close(true)}
          >
            {a.yes}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Avatar({ user, size = 40 }: { user: CUser | null; size?: number }) {
  const hue = user ? [...user.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 360, 7) : 0;
  return user?.picture ? (
    <img
      class="ava"
      src={user.picture}
      alt=""
      width={size}
      height={size}
      referrerpolicy="no-referrer"
      loading="lazy"
    />
  ) : (
    <span
      class="ava ini"
      style={{ width: `${size}px`, height: `${size}px`, "--hue": hue }}
      aria-hidden="true"
    >
      {(user?.name ?? "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

export const Name = ({ user, l }: { user: CUser; l: L }) => (
  <span class="nm">
    <b>{user.name}</b>
    {user.username && <small>@{user.username}</small>}
    {user.owner && <em class="badge">{strings(l).author}</em>}
  </span>
);

export function LoginButton({ l, back }: { l: L; back?: string }) {
  const b = strings(l);
  return (
    <a
      class="btn telegram"
      href={loginUrl(back)}
      onClick={(e) => {
        if (!DEMO) return;
        e.preventDefault();
        void import("./demo").then((m) => {
          m.demoLogin(true);
          return refreshMe();
        });
      }}
    >
      <Ico n="telegram" />
      {b.login}
    </a>
  );
}

export function DemoOwner() {
  if (!DEMO) return null;
  return (
    <button
      type="button"
      class="linkbtn demo-owner"
      onClick={() => void import("./demo").then((m) => (m.demoLogin(true, true), refreshMe()))}
    >
      Демо: войти как владелец
    </button>
  );
}

export function BanNotice({
  ban,
  scope,
  l,
}: {
  ban: NonNullable<BanInfo>;
  scope: "blog" | "themes" | "all";
  l: L;
}) {
  const b = strings(l);
  return (
    <div class="ban" role="alert">
      <h3>
        <Ico n="lock" /> {b.banTitle}
      </h3>
      <p>{scope === "themes" ? b.banThemes : scope === "all" ? b.banAll : b.banBlog}</p>
      {ban.reason && (
        <p>
          <b>{b.banReason}:</b> {ban.reason}
        </p>
      )}
      <p>{ban.until ? `${b.banUntil}: ${dateOf(ban.until, l)}` : b.banForever}</p>
      <p>
        {b.banContact}{" "}
        <a href="https://t.me/the_nikeri" target="_blank" rel="noopener noreferrer">
          @The_Nikeri
        </a>
      </p>
    </div>
  );
}

export function Account({ l }: { l: L }) {
  const b = strings(l);
  const me = useMe();
  const [open, setOpen] = useState(false);
  if (!me) return null;
  if (!me.user) {
    return (
      <div class="acct">
        <LoginButton l={l} />
        <p class="hint">{b.loginHint}</p>
        <DemoOwner />
      </div>
    );
  }
  const bad = me.bans?.blog;
  return (
    <div class="acct in">
      <div class="row">
        <Avatar user={me.user} size={36} />
        <div>
          <small>{b.signedAs}</small>
          <Name user={me.user} l={l} />
        </div>
        <button type="button" class="link" onClick={() => setOpen(!open)} aria-expanded={open}>
          <Ico n="sliders" />
          <span class="sr">menu</span>
        </button>
      </div>
      {open && (
        <div class="acctmenu">
          <button type="button" class="link" onClick={() => void signOut()}>
            {b.logout}
          </button>
          <button
            type="button"
            class="link bad"
            onClick={() => {
              if (confirm(b.deleteConfirm)) void removeAccount();
            }}
          >
            {b.deleteAccount}
          </button>
        </div>
      )}
      {bad && <BanNotice ban={bad} scope="blog" l={l} />}
    </div>
  );
}
