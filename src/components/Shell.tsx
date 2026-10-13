import { useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { flipMode, useTheme } from "../hooks/useTheme";
import type { Theme } from "../hooks/useTheme";
import { useLang } from "../hooks/useLang";
import { useRetro } from "../hooks/useRetro";
import { useShortcuts } from "../hooks/useShortcuts";
import { useZoomGuard } from "../hooks/useZoomGuard";
import { useTrail } from "../hooks/useTrail";
import type { L } from "../lib/i18n";
import { EventBanner } from "./EventBanner";
import { Announcements } from "./Announcements";
import { Background } from "./Background";
import { Customizer } from "./Customizer";
import { Footer } from "./Footer";
import { Nav } from "./Nav";
import { RetroBar, RetroDial, RetroFooter } from "./Retro";
import { ToTop } from "./ToTop";
import { Live } from "../live/Live";
import { Weather, resolve } from "../weather/Weather";
import { useWeatherPrefs } from "../weather/prefs";
import type { WxPrefs } from "../weather/prefs";
import { StampsHost } from "../stamps/Stamps";
import { earnedCount, found } from "../stamps/client";
import { useEggs } from "../stamps/eggs";
import { Terminal } from "../terminal/Terminal";
import { useReport } from "../weather/report";
import "../styles/index.scss";

export type ShellCtx = { l: L; retro: boolean; th: Theme };

export function Shell({
  page,
  preview = false,
  before,
  children,
}: {
  page: "home" | "uses" | "blog" | "games";
  preview?: boolean;
  before?: ComponentChildren;
  children: (c: ShellCtx) => ComponentChildren;
}) {
  const [l, setL] = useLang();
  const [open, setOpen] = useState(false);
  const gearRef = useRef<HTMLButtonElement>(null);
  const [retro, setRetro] = useRetro();
  useZoomGuard();
  const [th, setTh] = useTheme(retro);
  useTrail(retro);
  const [wx, setWxRaw] = useWeatherPrefs();
  const report = useReport(wx.sky === "auto" && !preview);
  const setWx = (p: WxPrefs) => {
    if (p.sky !== wx.sky) found("weatherman");
    setWxRaw(p);
  };
  const kind = resolve(wx, report).plan?.kind;
  useEggs(page, kind === "rain" || kind === "downpour" || kind === "storm");
  useShortcuts({
    lang: () => (found("hotkeys"), setL((x) => (x === "ru" ? "en" : "ru"))),
    theme: () => (found("hotkeys"), setTh(flipMode(th))),
  });
  return (
    <>
      {before}
      {retro && <RetroDial l={l} />}
      {retro && <RetroBar l={l} onExit={() => setRetro(false)} />}
      <Announcements l={l} preview={preview} />
      {!preview && <EventBanner l={l} />}
      <Background />
      {!preview && <Weather prefs={wx} report={report} />}
      <main id="top">
        <Nav page={page} l={l} setL={setL} open={open} setOpen={setOpen} gearRef={gearRef} />
        {children({ l, retro, th })}
      </main>
      {retro && <RetroFooter l={l} />}
      <Footer l={l} />
      <ToTop l={l} />
      {!preview && <Live l={l} />}
      {!preview && <StampsHost l={l} />}
      {!preview && (
        <Terminal
          l={l}
          setL={setL}
          th={th}
          setTh={setTh}
          wx={wx}
          setWx={setWx}
          retro={retro}
          setRetro={setRetro}
          earned={earnedCount}
        />
      )}
      <Customizer
        l={l}
        th={th}
        setTh={setTh}
        retro={retro}
        setRetro={setRetro}
        open={open}
        setOpen={setOpen}
        gearRef={gearRef}
        wx={wx}
        setWx={setWx}
        report={report}
      />
    </>
  );
}
