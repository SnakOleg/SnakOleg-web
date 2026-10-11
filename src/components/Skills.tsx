import { site } from "../config";
import { tx } from "../lib/i18n";
import type { L } from "../lib/i18n";

export function Skills({ l }: { l: L }) {
  const u = site.ui[l];
  const rows = [site.soft, [...site.soft].reverse(), [...site.soft.slice(3), ...site.soft.slice(0, 3)]];
  return (
    <>
      <h2 class="ph rv" id="skills">
        {u.skills}
      </h2>
      <section class="skills">
        <div class="rv">
          <h3>{u.hard}</h3>
          <div class="hard">
            {site.hard.map((g) => (
              <div class="grp">
                <span>{tx(g.group, l)}</span>
                <ul class="chips">
                  {g.items.map((s) => (
                    <li>{s}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div class="rv soft" style={{ "--i": 1 }}>
          <h3>{u.soft}</h3>
          {rows.map((r, k) => (
            <div class={"marq" + (k === 1 ? " rev" : k === 2 ? " slow" : "")}>
              <div>{[0, 1].map(() => r.map((s) => <em>{tx(s, l)}</em>))}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
