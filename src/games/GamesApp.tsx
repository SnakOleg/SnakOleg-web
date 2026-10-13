import { Shell } from "../components/Shell";
import { Toasts } from "../blog/ui";
import type { L } from "../lib/i18n";
import { GAMES, gameHref } from "./client";
import type { GameTab } from "./client";
import { Capsule } from "./Capsule";
import { Garden } from "./Garden";
import { Quick } from "./Quick";
import { gameStrings } from "./strings";
import { Word } from "./Word";
import "./games.scss";

const ART: Record<GameTab, string> = {
  word: "M8 40h12V8H8zM26 40h12V8H26z",
  reaction: "M26 4L10 28h10l-4 16 18-26H24z",
  garden: "M24 44V22M24 30q-12 0-14-12q12 0 14 12zM24 24q12 0 14-12q-12 0-14 12z",
  capsule: "M14 22a10 10 0 0 1 20 0v4H14zM14 26v8a10 10 0 0 0 20 0v-8z",
};

function Hub({ l }: { l: L }) {
  const t = gameStrings(l);
  return (
    <div class="ghub">
      <h1>{t.title}</h1>
      <p>{t.hubHint}</p>
      <ul>
        {GAMES.map((g) => (
          <li key={g} class={`gc ${g}`}>
            <a href={gameHref(g)}>
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path d={ART[g]} />
              </svg>
              <b>{t.cards[g]![0]}</b>
              <span>{t.cards[g]![1]}</span>
              <em>{t.play}</em>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Frame({ l, game, children }: { l: L; game: GameTab; children: preact.ComponentChildren }) {
  const t = gameStrings(l);
  return (
    <div class={`gpage ${game}`}>
      <a class="gbackl" href="/games">
        ← {t.back}
      </a>
      <header>
        <h1>{t.cards[game]![0]}</h1>
        <p>{t.cards[game]![1]}</p>
      </header>
      {children}
    </div>
  );
}

function Page({ l }: { l: L }) {
  const game = location.pathname.replace(/\/$/, "").split("/")[2] as GameTab | undefined;
  if (game === "word")
    return (
      <Frame l={l} game="word">
        <Word l={l} />
      </Frame>
    );
  if (game === "reaction")
    return (
      <Frame l={l} game="reaction">
        <Quick l={l} />
      </Frame>
    );
  if (game === "garden")
    return (
      <Frame l={l} game="garden">
        <Garden l={l} />
      </Frame>
    );
  if (game === "capsule")
    return (
      <Frame l={l} game="capsule">
        <Capsule l={l} />
      </Frame>
    );
  return <Hub l={l} />;
}

export function GamesApp() {
  return (
    <Shell page="games">
      {({ l }) => (
        <>
          <Page l={l} />
          <Toasts />
        </>
      )}
    </Shell>
  );
}
