import { site } from "../config";
import type { L } from "../lib/i18n";
import { Ico } from "./ui/Icon";
import { Wordmark } from "./graphics/Wordmark";

export function Footer({ l }: { l: L }) {
  return (
    <footer class="foot">
      <Wordmark />
      <div class="fb2">
        <small onClick={(e) => e.detail === 3 && location.assign("/admin")}>
          © {new Date().getFullYear()} Snak
        </small>
        <a href="#top">
          <Ico n="arrow-up" />
          {site.ui[l].top}
        </a>
      </div>
    </footer>
  );
}
