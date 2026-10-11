import { site } from "../config";

type Content = {
  profile?: object;
  contacts?: unknown;
  skills?: { hard?: unknown; soft?: unknown };
  projects?: unknown;
  uses?: unknown;
  announce?: unknown;
  github?: object;
  theme?: object;
};

export function applyContent(c: Content) {
  const s = site as Record<string, any>;
  if (c.profile) Object.assign(s, c.profile);
  if (c.contacts) s.contacts = c.contacts;
  if (c.skills?.hard) s.hard = c.skills.hard;
  if (c.skills?.soft) s.soft = c.skills.soft;
  if (c.projects) s.projects = c.projects;
  if (c.uses) s.uses = c.uses;
  if (c.announce) s.announce = c.announce;
  if (c.github) Object.assign(s.github, c.github);
  if (c.theme) Object.assign(s.theme, c.theme);
}

export async function loadContent(timeoutMs = 1500) {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    const res = await fetch("/api/content", { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) return;
    applyContent(await res.json());
  } catch {
    // no API (static hosting, offline): the defaults from src/config stay
  }
}
