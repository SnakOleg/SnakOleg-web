import { useEffect, useState } from "preact/hooks";
import { site } from "../../config";
import type { L } from "../../lib/i18n";
import { ProjectCard, group, slugOf } from "./ProjectCard";
import { ProjectDialog } from "./ProjectDialog";

const REACH = 160;
const glow = (e: MouseEvent) => {
  for (const el of (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(".card")) {
    const b = el.getBoundingClientRect();
    const dx = Math.max(b.left - e.clientX, 0, e.clientX - b.right);
    const dy = Math.max(b.top - e.clientY, 0, e.clientY - b.bottom);
    el.style.setProperty("--mx", `${e.clientX - b.left}px`);
    el.style.setProperty("--my", `${e.clientY - b.top}px`);
    el.style.setProperty("--near", String(Math.max(0, 1 - Math.hypot(dx, dy) / REACH).toFixed(3)));
  }
};
const dim = (e: MouseEvent) => {
  for (const el of (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(".card"))
    el.style.setProperty("--near", "0");
};

const fromHash = () => (location.hash.startsWith("#/p/") ? location.hash.slice(4) : "");

export function Projects({ l }: { l: L }) {
  const u = site.ui[l];
  const [kind, setKind] = useState("all");
  const [st, setSt] = useState("all");
  const [open, setOpen] = useState(fromHash);

  useEffect(() => {
    const onHash = () => setOpen(fromHash());
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  const close = () => {
    history.pushState(null, "", location.pathname + location.search);
    setOpen("");
  };
  const current = site.projects.find((p) => slugOf(p) === open);
  const shown = site.projects.filter(
    (p) => (kind === "all" || p.kind === kind) && (st === "all" || group(p.state) === st),
  );
  return (
    <>
      <h2 class="ph rv" id="projects">
        {u.projects}
      </h2>
      <div class="filters rv">
        <div class="fg" role="group">
          {(["all", "order", "personal", "team"] as const).map((k) => (
            <button type="button" class={kind === k ? "sel" : ""} onClick={() => setKind(k)}>
              {k === "all" ? u.all : u.kindsP[k]}
              <sup>
                {k === "all" ? site.projects.length : site.projects.filter((p) => p.kind === k).length}
              </sup>
            </button>
          ))}
        </div>
        <div class="fg" role="group">
          {(["all", "active", "done", "inactive"] as const).map((k) => (
            <button type="button" class={st === k ? "sel" : ""} onClick={() => setSt(k)}>
              {k === "all" ? u.all : u[("f_" + k) as "f_active"]}
            </button>
          ))}
        </div>
      </div>
      <ul class="grid rv" onMouseMove={glow} onMouseLeave={dim}>
        {shown.map((p, i) => (
          <ProjectCard p={p} l={l} i={i} />
        ))}
      </ul>
      {!shown.length && <p class="empty">{u.empty}</p>}
      {current && <ProjectDialog p={current} l={l} onClose={close} />}
    </>
  );
}
