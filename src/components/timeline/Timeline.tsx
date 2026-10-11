import { site } from "../../config";
import type { GH } from "../../hooks/useGithub";
import { fmt } from "../../lib/i18n";
import type { L } from "../../lib/i18n";
import { GraphTimeline } from "./GraphTimeline";

export function Timeline({ l, gh }: { l: L; gh: GH }) {
  const u = site.ui[l];
  return (
    <>
      <h2 class="ph rv" id="timeline">
        {u.timeline}
      </h2>
      <p class="cmd rv">
        <span>$</span> git log --graph --oneline
      </p>
      <p class="live rv">
        <i class={gh.live ? "on" : ""} />
        {gh.live ? u.live : `${u.snap} ${fmt(gh.generatedAt, l, true)}`}
      </p>
      <GraphTimeline l={l} gh={gh} />
    </>
  );
}
