import { site } from "../../config";
import type { projects } from "../../config/projects";
import { tx } from "../../lib/i18n";
import type { L } from "../../lib/i18n";
import { Ico } from "../ui/Icon";
import { Num } from "../ui/Num";
import { Banner } from "../graphics/Banner";

type Project = (typeof projects)[number];
export const slugOf = (p: { name: string }) =>
  p.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const group = (s: string) => (s === "paused" || s === "archive" ? "inactive" : s);

export function ProjectCard({ p, l, i }: { p: Project; l: L; i: number }) {
  const u = site.ui[l];
  return (
    <li style={{ "--i": i % 6 }}>
      <a class="card" href={`#/p/${slugOf(p)}`}>
        <Banner h={p.hue} g={p.glyph} img={p.img} />
        <div class="cb">
          <div class="ct">
            <Ico n="code" />
            <b>{p.name}</b>
            <Ico n="arrow-right" />
          </div>
          <div class="badges">
            <span class={"st k-" + p.kind}>{u.kinds[p.kind]}</span>
            <span class={"st s-" + group(p.state)}>
              <i />
              {p.status ? tx(p.status, l) : u.states[p.state]}
            </span>
          </div>
          <p>{tx(p.desc, l)}</p>
          {p.stats && (
            <div class="stats">
              <div>
                <Num to={p.stats.servers} />
                {u.servers}
              </div>
              <div>
                <Num to={p.stats.users} />
                {u.users}
              </div>
              <div>
                <Num to={p.stats.commands} />
                {u.commands}
              </div>
            </div>
          )}
          <div class="tech">
            {p.tags.map((s) => (
              <i>{s}</i>
            ))}
          </div>
        </div>
      </a>
    </li>
  );
}
