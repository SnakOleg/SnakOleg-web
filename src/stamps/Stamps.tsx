import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { STAMPS } from "../../shared/stamps";
import type { L } from "../lib/i18n";
import { loginUrl, useMe } from "../blog/api";
import { PASSPORT_EVENT, STAMP_EVENT, openPassport, useEarned } from "./client";
import { lookOf } from "./look";
import { InkDefs, Stamp } from "./Stamp";
import { stampStrings } from "./strings";
import "./stamps.scss";

const SHOW_MS = 4500;

function Toast({ l }: { l: L }) {
  const t = stampStrings(l);
  const [code, setCode] = useState<string | null>(null);
  const timer = useRef(0);
  useEffect(() => {
    const on = (e: Event) => {
      setCode((e as CustomEvent<string>).detail);
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCode(null), SHOW_MS);
    };
    addEventListener(STAMP_EVENT, on);
    return () => {
      removeEventListener(STAMP_EVENT, on);
      clearTimeout(timer.current);
    };
  }, []);
  const look = code ? lookOf(code, l) : null;
  if (!code || !look) return null;
  return (
    <button type="button" class="stoast" onClick={() => (setCode(null), openPassport())}>
      <InkDefs />
      <Stamp look={look} id={code} />
      <span>
        <small>{t.newStamp}</small>
        <b>{look.title}</b>
      </span>
    </button>
  );
}

type Pick = { code: string; from: DOMRect };

function Focus({ pick, l, got, onClose }: { pick: Pick; l: L; got: boolean; onClose: () => void }) {
  const t = stampStrings(l);
  const look = lookOf(pick.code, l)!;
  const art = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const closing = useRef(false);

  const flip = (reverse: boolean) => {
    const el = art.current;
    if (!el) return Promise.resolve();
    const to = el.getBoundingClientRect();
    const dx = pick.from.left + pick.from.width / 2 - (to.left + to.width / 2);
    const dy = pick.from.top + pick.from.height / 2 - (to.top + to.height / 2);
    const from = `translate(${dx}px, ${dy}px) scale(${pick.from.width / to.width})`;
    return el.animate(
      { transform: reverse ? ["none", from] : [from, "none"] },
      { duration: reverse ? 320 : 520, easing: "cubic-bezier(0.2, 0.85, 0.25, 1)", fill: "both" },
    ).finished;
  };

  useLayoutEffect(() => void flip(false), []);

  const close = async () => {
    if (closing.current) return;
    closing.current = true;
    back.current?.classList.add("out");
    await flip(true);
    onClose();
  };

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      void close();
    };
    addEventListener("keydown", esc, true);
    return () => removeEventListener("keydown", esc, true);
  }, []);

  return (
    <div class="pfocus" ref={back} onClick={() => void close()}>
      <figure>
        <div class="pbig" ref={art}>
          <Stamp look={look} id={`${pick.code}-big`} locked={!got} />
        </div>
        <figcaption>
          <b>{look.title}</b>
          <span>{look.hint || look.title}</span>
          <small class={got ? "ok" : ""}>{got ? t.owned : t.notYet}</small>
        </figcaption>
      </figure>
    </div>
  );
}

function Passport({ l, onClose }: { l: L; onClose: () => void }) {
  const t = stampStrings(l);
  const me = useMe();
  const { list } = useEarned();
  const have = new Map(list.map((e) => [e.code, e]));
  const close = useRef<HTMLButtonElement>(null);
  const [pick, setPick] = useState<Pick | null>(null);

  useEffect(() => {
    close.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector(".pfocus") && onClose();
    addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, []);

  const own = (kind: "egg" | "action") => STAMPS.filter((s) => s.kind === kind);
  const extra = (prefix: string) =>
    list
      .filter((e) => e.code.startsWith(prefix))
      .sort((a, b) => a.created - b.created)
      .map((e) => e.code);
  const total = STAMPS.length;
  const got = STAMPS.filter((s) => have.has(s.id)).length;

  const grid = (ids: string[], hide = false) =>
    ids.length === 0 ? (
      <p class="pnone">{t.nothing}</p>
    ) : (
      <ul class="pgrid">
        {ids.map((id) => {
          const look = lookOf(id, l)!;
          const ok = have.has(id);
          return (
            <li class={ok ? "got" : "lock"}>
              <button
                type="button"
                class="pcell"
                aria-label={look.title}
                onClick={(e) =>
                  setPick({
                    code: id,
                    from: (
                      e.currentTarget.querySelector(".stamp") ?? e.currentTarget
                    ).getBoundingClientRect(),
                  })
                }
              >
                <Stamp look={look} id={id} locked={!ok} />
                <b>{ok ? look.title : t.locked}</b>
                {(!ok || hide) && look.hint && <small>{look.hint}</small>}
              </button>
            </li>
          );
        })}
      </ul>
    );

  return (
    <div class="pback" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div class="ppass" role="dialog" aria-modal="true" aria-label={t.title}>
        <InkDefs />
        <header>
          <div>
            <h2>{t.title}</h2>
            <p>
              {me?.user ? `${me.user.name} · ` : ""}
              {t.count(got, total)}
            </p>
          </div>
          <button type="button" class="pclose" ref={close} aria-label={t.close} onClick={onClose}>
            ×
          </button>
        </header>
        <p class="pnote">
          {me?.user ? (
            t.saved
          ) : (
            <>
              {t.guest} <a href={loginUrl()}>{t.login}</a>
            </>
          )}
        </p>
        <h3>{t.finds}</h3>
        {grid(own("egg").map((s) => s.id))}
        <h3>{t.actions}</h3>
        {grid(own("action").map((s) => s.id))}
        {extra("c:").length > 0 && (
          <>
            <h3>{t.countries}</h3>
            {grid(extra("c:"))}
          </>
        )}
        {extra("s:").length > 0 && (
          <>
            <h3>{t.seasons}</h3>
            {grid(extra("s:"))}
          </>
        )}
      </div>
      {pick && <Focus pick={pick} l={l} got={have.has(pick.code)} onClose={() => setPick(null)} />}
    </div>
  );
}

export function StampsHost({ l }: { l: L }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setOpen(true);
    addEventListener(PASSPORT_EVENT, on);
    return () => removeEventListener(PASSPORT_EVENT, on);
  }, []);
  return (
    <>
      <Toast l={l} />
      {open && <Passport l={l} onClose={() => setOpen(false)} />}
    </>
  );
}
