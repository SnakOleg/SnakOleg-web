import { site } from "../config";
import type { L } from "../lib/i18n";
import { Ico } from "./ui/Icon";
import { NowBadge } from "./NowBadge";
import { Wordmark } from "./graphics/Wordmark";
import { gameStrings } from "../games/strings";
import { openPassport } from "../stamps/client";
import { stampStrings } from "../stamps/strings";
import { openTerminal } from "../terminal/Terminal";

export function Footer({ l }: { l: L }) {
  return (
    <footer class="foot">
      <Wordmark />
      <NowBadge l={l} />
      <div class="fb2">
        <small onClick={(e) => e.detail === 3 && location.assign("/admin")}>
          © {new Date().getFullYear()} Snak
        </small>
        <span>
          <button type="button" class="passbtn" onClick={openPassport}>
            {stampStrings(l).footer}
          </button>
          <a class="passbtn" href="/games">
            {gameStrings(l).title}
          </a>
          <button type="button" class="termbtn" aria-label="Terminal" title="`" onClick={openTerminal}>
            &gt;_
          </button>
        </span>
        <a href="#top">
          <Ico n="arrow-up" />
          {site.ui[l].top}
        </a>
      </div>
    </footer>
  );
}
