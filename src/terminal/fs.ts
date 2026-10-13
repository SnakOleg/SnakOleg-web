import { site } from "../config";
import { tx } from "../lib/i18n";
import type { L } from "../lib/i18n";

export type Entry =
  { dir: true; hidden?: boolean } | { dir: false; hidden?: boolean; read: (l: L) => string };

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const projectFiles = () =>
  Object.fromEntries(
    site.projects.map((p) => [
      `/home/guest/projects/${slug(p.name)}.txt`,
      {
        dir: false,
        read: (l: L) =>
          [
            p.name,
            tx(p.role ?? "", l),
            "",
            tx(p.details ?? "", l),
            "",
            `[${p.tags.join(", ")}]`,
            p.href ?? "",
          ]
            .filter((x, i, a) => x || a[i - 1])
            .join("\n"),
      } as Entry,
    ]),
  );

const files = (): Record<string, Entry> => ({
  "/": { dir: true },
  "/home": { dir: true },
  "/home/guest": { dir: true },
  "/home/guest/projects": { dir: true },
  "/home/guest/about.txt": { dir: false, read: (l) => tx(site.about, l) },
  "/home/guest/skills.txt": {
    dir: false,
    read: () => site.hard.map((g) => `${tx(g.group, "en")}: ${g.items.join(", ")}`).join("\n"),
  },
  "/home/guest/contacts.txt": {
    dir: false,
    read: (l) => site.contacts.map((c) => `${tx(c.label, l)}: ${c.href}`).join("\n"),
  },
  "/home/guest/.secret": {
    dir: false,
    hidden: true,
    read: () => "You found it. Not every file shows up at once.",
  },
  "/etc": { dir: true },
  "/etc/passwd": {
    dir: false,
    read: () => "root:x:0:0:root:/root:/bin/sh\nguest:x:1000:1000:Visitor:/home/guest:/bin/snaksh",
  },
  ...projectFiles(),
});

export const HOME = "/home/guest";

export function resolve(cwd: string, arg = ""): string {
  const start = !arg || arg === "~" ? HOME : arg.startsWith("~/") ? HOME + arg.slice(1) : arg;
  const parts = (start.startsWith("/") ? start : `${cwd}/${start}`).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return "/" + out.join("/");
}

export const show = (cwd: string) =>
  cwd === HOME ? "~" : cwd.startsWith(HOME + "/") ? "~" + cwd.slice(HOME.length) : cwd;

export const stat = (path: string) => files()[path];

export function list(path: string, all: boolean) {
  const base = path === "/" ? "" : path;
  return Object.entries(files())
    .filter(([p]) => p.startsWith(base + "/") && p !== path && !p.slice(base.length + 1).includes("/"))
    .filter(([, e]) => all || !e.hidden)
    .map(([p, e]) => p.slice(base.length + 1) + (e.dir ? "/" : ""))
    .sort();
}
