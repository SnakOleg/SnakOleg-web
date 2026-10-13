import { useEffect, useState } from "preact/hooks";
import type { NowState } from "../../shared/now";
import { api } from "../blog/api";
import { ago } from "../blog/strings";
import { gameStrings } from "../games/strings";
import type { L } from "../lib/i18n";

export function NowBadge({ l }: { l: L }) {
  const [now, setNow] = useState<NowState | null>(null);
  useEffect(() => {
    void api<{ now: NowState | null }>("/api/now").then((r) => setNow(r.ok ? (r.data.now ?? null) : null));
  }, []);
  if (!now) return null;
  return (
    <p class="nowb">
      <span aria-hidden="true">{now.icon}</span>
      <b>{gameStrings(l).now}:</b> {now[l]}
      <time>{ago(now.ts, l)}</time>
    </p>
  );
}
