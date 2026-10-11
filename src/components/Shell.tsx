import { useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { site } from "../config";
import { flipMode, useTheme } from "../hooks/useTheme";
import type { Theme } from "../hooks/useTheme";
import { useLang } from "../hooks/useLang";
import { useRetro } from "../hooks/useRetro";
import { useShortcuts } from "../hooks/useShortcuts";
import { useTrail } from "../hooks/useTrail";
import { useAwayTitle } from "../hooks/useAwayTitle";
import type { L } from "../lib/i18n";
import { Announcements } from "./Announcements";
import { Background } from "./Background";
import { Customizer } from "./Customizer";
import { Footer } from "./Footer";
import { Nav } from "./Nav";
import { RetroBar, RetroDial, RetroFooter } from "./Retro";
import { ToTop } from "./ToTop";
import "../styles/index.scss";

export type ShellCtx = { l: L; retro: boolean; th: Theme };

export function Shell({
  page,
  preview = false,
  before,
  children,
}: {
  page: "home" | "uses" | "blog";
  preview?: boolean;
  before?: ComponentChildren;
  children: (c: ShellCtx) => ComponentChildren;
}) {
  const [l, setL] = useLang();
  const [open, setOpen] = useState(false);
  const gearRef = useRef<HTMLButtonElement>(null);
  const [retro, setRetro] = useRetro();
  const [th, setTh] = useTheme(retro);
  useTrail(retro);
  useAwayTitle(site.ui[l].away);
  useShortcuts({
    lang: () => setL((x) => (x === "ru" ? "en" : "ru")),
    theme: () => setTh(flipMode(th)),
  });
  return (
    <>
      {before}
      {retro && <RetroDial l={l} />}
      {retro && <RetroBar l={l} onExit={() => setRetro(false)} />}
      <Announcements l={l} preview={preview} />
      <Background />
      <a class="skip" href="#main">
        {site.ui[l].skip}
      </a>
      <main id="top">
        <Nav page={page} l={l} setL={setL} open={open} setOpen={setOpen} gearRef={gearRef} />
        {children({ l, retro, th })}
      </main>
      {retro && <RetroFooter l={l} />}
      <Footer l={l} />
      <ToTop l={l} />
      <Customizer
        l={l}
        th={th}
        setTh={setTh}
        retro={retro}
        setRetro={setRetro}
        open={open}
        setOpen={setOpen}
        gearRef={gearRef}
      />
    </>
  );
}
