import { site } from "../config";
import { tx } from "../lib/i18n";
import type { L } from "../lib/i18n";
import { useType } from "../hooks/useType";
import { found } from "../stamps/client";
import avatarCat from "../assets/illustrations/avatar-cat.svg";

let pets = 0;

export function Hero({ l }: { l: L }) {
  const role = useType(site.roles.map((r) => r[l]));
  return (
    <section class="hero" id="main">
      <div class="who rv">
        <img
          class="av"
          src={site.avatar || avatarCat}
          alt=""
          width="144"
          height="144"
          onClick={() => ++pets >= 12 && found("cat")}
        />
        <div>
          <p class="hi">{tx(site.hi, l)}</p>
          <h1>
            {[...tx(site.name, l)].map((ch, i) => (
              <span style={{ "--i": i }}>{ch}</span>
            ))}
          </h1>
          <p class="role">
            {role}
            <span class="caret" />
          </p>
        </div>
      </div>
      <div class="about rv" style={{ "--i": 1 }}>
        <div class="win">
          <i />
          <i />
          <i />
          <span>about.ts</span>
        </div>
        <h2>{site.ui[l].about}</h2>
        <p>{tx(site.about, l)}</p>
      </div>
    </section>
  );
}
