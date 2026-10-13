import { useEffect, useRef, useState } from "preact/hooks";
import { QUICK_STAMP } from "../../shared/words";
import { api, currentMe } from "../blog/api";
import { found } from "../stamps/client";
import type { L } from "../lib/i18n";
import { gameStrings } from "./strings";

type Top = { ms: number; name: string; picture: string };
type Board = { t: number; top: Top[]; mine: number | null };
type Phase = "idle" | "wait" | "go" | "done" | "early";

export function Quick({ l }: { l: L }) {
  const t = gameStrings(l);
  const [phase, setPhase] = useState<Phase>("idle");
  const [ms, setMs] = useState(0);
  const [board, setBoard] = useState<Board | null>(null);
  const [stamped, setStamped] = useState(false);
  const token = useRef(0);
  const began = useRef(0);
  const timer = useRef(0);

  const refresh = async () => {
    const r = await api<Board>("/api/game?kind=quick");
    if (r.ok) {
      setBoard(r.data);
      token.current = r.data.t;
    }
    return r.ok;
  };
  useEffect(() => {
    void refresh();
    return () => clearTimeout(timer.current);
  }, []);

  const start = async () => {
    setStamped(false);
    setPhase("wait");
    if (!(await refresh())) token.current = 0;
    timer.current = window.setTimeout(
      () => {
        began.current = performance.now();
        setPhase("go");
      },
      1000 + Math.random() * 2500,
    );
  };

  const tap = async () => {
    if (phase === "idle" || phase === "done" || phase === "early") return void start();
    if (phase === "wait") {
      clearTimeout(timer.current);
      return setPhase("early");
    }
    const took = Math.round(performance.now() - began.current);
    setMs(took);
    setPhase("done");
    if (currentMe()?.user && token.current) {
      const r = await api<{ added: string[] }>("/api/game", "POST", {
        kind: "quick",
        ms: took,
        t: token.current,
      });
      if (r.ok) {
        setStamped(r.data.added.includes("quick"));
        r.data.added.forEach(found);
        void refresh();
      }
    }
  };

  const best = board?.mine ?? null;
  return (
    <div class="quick">
      <p class="ghint">{t.quickHint}</p>
      <button type="button" class={`qpad ${phase}`} onClick={() => void tap()}>
        {phase === "idle" && t.start}
        {phase === "wait" && t.wait}
        {phase === "go" && t.go}
        {phase === "early" && t.early}
        {phase === "done" && (
          <>
            <b>{t.yours(ms)}</b>
            <small>{ms < QUICK_STAMP ? (stamped ? t.stamp : "") : ""}</small>
            <small>{t.again}</small>
          </>
        )}
      </button>
      {best !== null && <p class="gnote">{t.best(best)}</p>}
      {!currentMe()?.user && <p class="gnote">{t.guest}</p>}
      <h3>{t.top}</h3>
      {board && board.top.length > 0 ? (
        <ol class="qtop">
          {board.top.map((r, i) => (
            <li key={i}>
              <span>{r.name}</span>
              <b>{t.yours(r.ms)}</b>
            </li>
          ))}
        </ol>
      ) : (
        <p class="gnote">{t.noTop}</p>
      )}
    </div>
  );
}
