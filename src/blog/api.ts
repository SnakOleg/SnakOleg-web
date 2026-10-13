import { useEffect, useState } from "preact/hooks";

export type Reactions = Record<string, number>;
export type CUser = { id: string; name: string; username: string; picture: string; owner: boolean };
export type PostBrief = {
  id: number;
  title: string;
  excerpt: string;
  tags: string[];
  cover: string;
  pinned: boolean;
  pub: number;
  views: number;
  comments: number;
  reactions: Reactions;
  mine: string[];
};
export type PostFull = PostBrief & { body: string; commentsOpen: boolean };
export type Cmt = {
  id: number;
  parent: number | null;
  to?: number | null;
  byOwner?: string[];
  user: CUser | null;
  body: string;
  flagged: boolean;
  deleted: boolean;
  pending: boolean;
  created: number;
  edited: number | null;
  pinned?: boolean;
  card?: { icon: string; c: string } | null;
  own: boolean;
  reactions: Reactions;
  mine: string[];
};
export type BanInfo = { reason: string; until: number | null } | null;
export type Me = {
  user: CUser | null;
  bans?: { blog: BanInfo; themes: BanInfo };
  settings: { commentsOpen: boolean; slowMode: number; themesOpen: boolean };
};

export const DEMO = Boolean(import.meta.env.VITE_BLOG_DEMO);

export type Reply<T> = {
  ok: boolean;
  status: number;
  data: T & { error?: string; ban?: BanInfo & { scope?: string } };
};

export async function api<T = unknown>(path: string, method = "GET", body?: unknown): Promise<Reply<T>> {
  if (DEMO) {
    const { demoApi } = await import("./demo");
    return demoApi(path, method, body) as Reply<T>;
  }
  try {
    const res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers:
        method === "GET" ? undefined : { "Content-Type": "application/json", "X-Requested-With": "snak" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "network" } as never };
  }
}

export const loginUrl = (back = location.pathname + location.search) =>
  DEMO ? "#demo-login" : `/api/auth/login?mode=user&return=${encodeURIComponent(back)}`;

let me: Me | null = null;
export const currentMe = () => me;
let pending: Promise<void> | null = null;
const subs = new Set<(m: Me | null) => void>();
const publish = (m: Me | null) => {
  me = m;
  subs.forEach((f) => f(m));
};

export function refreshMe() {
  pending ??= api<Me>("/api/user/me").then((r) => {
    pending = null;
    publish(r.ok ? r.data : { user: null, settings: { commentsOpen: true, slowMode: 10, themesOpen: true } });
  });
  return pending;
}

export async function signOut() {
  await api("/api/user/logout", "POST");
  publish(me && { ...me, user: null, bans: undefined });
}
export async function removeAccount() {
  await api("/api/user/me", "DELETE");
  publish(me && { ...me, user: null, bans: undefined });
}

export function useMe() {
  const [m, setM] = useState<Me | null>(me);
  useEffect(() => {
    subs.add(setM);
    if (!me) void refreshMe();
    return () => void subs.delete(setM);
  }, []);
  return m;
}

export const errorText = (data: { error?: string }, table: Record<string, string>) =>
  table[data.error ?? ""] ?? table.default;
