import { useEffect, useRef } from "preact/hooks";
import { site } from "../../config";
import type { projects } from "../../config/projects";
import { snapshot } from "../../lib/github";
import { fmt, tx } from "../../lib/i18n";
import type { L } from "../../lib/i18n";
import { Banner } from "../graphics/Banner";
import { Ico } from "../ui/Icon";
import { group } from "./ProjectCard";

type Project = (typeof projects)[number];

const FOCUSABLE = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function ProjectDialog({ p, l, onClose }: { p: Project; l: L; onClose: () => void }) {
  const u = site.ui[l];
  const box = useRef<HTMLDivElement>(null);
  const repo = snapshot.repos.find((r) => r.name === p.repo);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    document.body.classList.add("noscroll");
    box.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !box.current) return;
      const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const [first, last] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      document.body.classList.remove("noscroll");
      before?.focus();
    };
  }, []);

  return (
    <div class="pd-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="pd" role="dialog" aria-modal="true" aria-labelledby="pd-title" tabIndex={-1} ref={box}>
        <button type="button" class="pd-close" aria-label={u.close} onClick={onClose}>
          <Ico n="x" />
        </button>
        <Banner h={p.hue} g={p.glyph} img={p.img} />
        <div class="pd-body">
          <div class="badges">
            <span class={"st k-" + p.kind}>{u.kinds[p.kind]}</span>
            <span class={"st s-" + group(p.state)}>
              <i />
              {p.status ? tx(p.status, l) : u.states[p.state]}
            </span>
            {p.role && <span class="st">{tx(p.role, l)}</span>}
          </div>
          <h2 id="pd-title">{p.name}</h2>
          <p class="pd-text">{tx(p.details ?? p.desc, l)}</p>

          {p.stats && (
            <div class="stats">
              <div>
                <b>{p.stats.servers.toLocaleString("ru-RU")}</b>
                {u.servers}
              </div>
              <div>
                <b>{p.stats.users.toLocaleString("ru-RU")}</b>
                {u.users}
              </div>
              <div>
                <b>{p.stats.commands.toLocaleString("ru-RU")}</b>
                {u.commands}
              </div>
            </div>
          )}

          {repo && (
            <dl class="pd-gh" aria-label={u.fromGithub}>
              <div>
                <dt>{u.myCommits}</dt>
                <dd>{repo.mine === repo.commits ? repo.mine : `${repo.mine} / ${repo.commits}`}</dd>
              </div>
              {repo.firstMine && (
                <div>
                  <dt>{u.firstCommit}</dt>
                  <dd>{fmt(repo.firstMine, l, true)}</dd>
                </div>
              )}
              <div>
                <dt>{u.lastCommit}</dt>
                <dd>
                  <code>{repo.hash}</code> {fmt(repo.lastDate, l, true)}
                </dd>
              </div>
            </dl>
          )}

          <div class="tech">
            {p.tags.map((tag) => (
              <i>{tag}</i>
            ))}
          </div>
          <div class="pd-actions">
            <a class="primary" href={p.href}>
              {u.openProject}
              <Ico n="link" />
            </a>
            {p.repoUrl && (
              <a href={p.repoUrl}>
                <Ico n="github" />
                GitHub
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
