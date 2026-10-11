import { Ico } from "./ui/Icon";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Ref } from "preact";
import { validatePalette } from "../../shared/palette";
import type { Palette } from "../../shared/palette";
import { site } from "../config";
import { presets } from "../config/presets";
import { profile } from "../config/profile";
import type { Theme } from "../hooks/useTheme";
import { tx } from "../lib/i18n";
import type { L } from "../lib/i18n";
import { fetchCommunity, suggest } from "../lib/presets";
import { loginUrl, refreshMe, useMe } from "../blog/api";
import { dateOf, strings } from "../blog/strings";
import type { Community, SuggestResult } from "../lib/presets";

type Props = {
  l: L;
  th: Theme;
  setTh: (t: Theme) => void;
  retro: boolean;
  setRetro: (v: boolean) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  gearRef: Ref<HTMLButtonElement>;
};

const KEYS = ["bg", "surf", "ink", "acc", "acc2"] as const;
const same = (a: Palette | null | undefined, b: Palette) => !!a && KEYS.every((k) => a[k] === b[k]);

function Swatch({ palette }: { palette: Palette }) {
  return (
    <span class="sw" aria-hidden="true">
      {KEYS.map((k) => (
        <i style={{ background: palette[k] }} />
      ))}
    </span>
  );
}

export function Customizer({ l, th, setTh, retro, setRetro, open, setOpen, gearRef }: Props) {
  const u = site.ui[l];
  const b = strings(l);
  const me = useMe();
  const box = useRef<HTMLElement>(null);
  const [community, setCommunity] = useState<Community[]>([]);
  const [form, setForm] = useState({ name: "", author: "", comment: "" });
  const [result, setResult] = useState<SuggestResult | "busy" | "">("");

  useEffect(() => {
    if (open) void fetchCommunity().then(setCommunity);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const target = e.target as Node;
      const gear = (gearRef as { current: HTMLElement | null }).current;
      if (box.current?.contains(target) || gear?.contains(target)) return;
      setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", down);
    addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      removeEventListener("keydown", key);
    };
  }, [open]);

  const palette = th.palette ?? null;
  const problem = palette ? validatePalette(palette) : null;
  const known =
    !!palette &&
    (presets.some((p) => same(palette, p.palette)) || community.some((c) => same(palette, c.palette)));

  const choose = (next: Palette | null, label?: string) => setTh({ ...th, palette: next, label });

  const edit = (key: (typeof KEYS)[number], value: string) => {
    const dark =
      th.mode === "dark" || (th.mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    const base = palette ?? (dark ? presets[0].palette : presets[1].palette);
    choose({ ...base, [key]: value }, undefined);
  };

  const send = async () => {
    if (!palette || problem) return;
    const sent = Number(sessionStorage.getItem("snak-suggested") ?? 0);
    if (sent >= 3) return setResult("many");
    setResult("busy");
    const outcome = await suggest({ ...form, palette });
    if (outcome === "ok") {
      sessionStorage.setItem("snak-suggested", String(sent + 1));
      setForm({ name: "", author: "", comment: "" });
    }
    setResult(outcome);
    if (outcome === "banned" || outcome === "login") void refreshMe();
  };

  return (
    <aside ref={box} class={"cust" + (open ? " open" : "")} aria-hidden={!open}>
      <h4>{u.theme}</h4>
      <div class="seg">
        {(["auto", "light", "dark"] as const).map((m) => (
          <button type="button" class={th.mode === m ? "sel" : ""} onClick={() => setTh({ ...th, mode: m })}>
            {u[m]}
          </button>
        ))}
      </div>
      <h4>{u.font}</h4>
      <div class="seg">
        {(["default", "onest", "mono"] as const).map((f) => (
          <button
            type="button"
            class={(th.font ?? "default") === f ? "sel" : ""}
            onClick={() => setTh({ ...th, font: f })}
          >
            {f === "default" ? u.fontDefault : f === "onest" ? "Onest" : "Mono"}
          </button>
        ))}
      </div>
      <h4>{u.accent}</h4>
      <input
        type="range"
        min="0"
        max="360"
        value={th.hue}
        disabled={!!palette}
        onInput={(e) => setTh({ ...th, hue: +(e.target as HTMLInputElement).value })}
        aria-label={u.accent}
      />

      <h4>{u.presetsTitle}</h4>
      <ul class="pre">
        <li>
          <button type="button" class={!palette ? "sel" : ""} onClick={() => choose(null)}>
            <span class="sw def" aria-hidden="true" />
            <b>{u.presetDefault}</b>
          </button>
        </li>
        {presets.map((p) => (
          <li>
            <button
              type="button"
              class={same(palette, p.palette) ? "sel" : ""}
              onClick={() => choose(p.palette, tx(p.name, l))}
            >
              <Swatch palette={p.palette} />
              <b>{tx(p.name, l)}</b>
            </button>
          </li>
        ))}
        {community.map((c) => (
          <li>
            <button
              type="button"
              class={same(palette, c.palette) ? "sel" : ""}
              title={c.comment}
              onClick={() => choose(c.palette, c.name)}
            >
              <Swatch palette={c.palette} />
              <b>{c.name}</b>
              <small>
                {u.presetBy} {c.author}
              </small>
            </button>
          </li>
        ))}
      </ul>

      <h4>{u.colorsTitle}</h4>
      <div class="cols">
        {KEYS.map((k) => (
          <label>
            <input
              type="color"
              value={palette?.[k] ?? "#888888"}
              onInput={(e) => edit(k, (e.target as HTMLInputElement).value)}
            />
            <span>{u.colorNames[k]}</span>
          </label>
        ))}
      </div>
      {problem && (
        <p class="warn" role="alert">
          {u.presetProblems[problem as keyof typeof u.presetProblems]}
        </p>
      )}

      {palette && !problem && !known && th.presets !== false && (
        <div class="sug">
          <h4>{u.suggest}</h4>
          {!me ? null : !me.user ? (
            <>
              <p class="hk">{u.suggestLogin}</p>
              <a class="go" href={loginUrl()}>
                <Ico n="telegram" /> {b.login}
              </a>
            </>
          ) : me.bans?.themes ? (
            <div class="sban" role="alert">
              <b>{b.banTitle}</b>
              <p>{b.banThemes}</p>
              {me.bans.themes.reason && (
                <p>
                  {b.banReason}: {me.bans.themes.reason}
                </p>
              )}
              <p>
                {me.bans.themes.until ? `${b.banUntil}: ${dateOf(me.bans.themes.until, l)}` : b.banForever}
              </p>
              <p>
                {b.banContact}{" "}
                <a href="https://t.me/the_nikeri" target="_blank" rel="noopener noreferrer">
                  @The_Nikeri
                </a>
              </p>
            </div>
          ) : me.settings.themesOpen === false ? (
            <p class="hk">{u.suggestResult.closed}</p>
          ) : (
            <>
              <p class="hk">{u.suggestHint}</p>
              <label class="fld">
                <span>{u.suggestName}</span>
                <input
                  maxLength={30}
                  value={form.name}
                  onInput={(e) => setForm({ ...form, name: (e.target as HTMLInputElement).value })}
                />
              </label>
              <label class="fld">
                <span>{u.suggestAuthor}</span>
                <input
                  maxLength={30}
                  value={form.author}
                  onInput={(e) => setForm({ ...form, author: (e.target as HTMLInputElement).value })}
                />
              </label>
              <label class="fld">
                <span>
                  {u.suggestComment} <small>{form.comment.length}/140</small>
                </span>
                <input
                  maxLength={140}
                  value={form.comment}
                  onInput={(e) => setForm({ ...form, comment: (e.target as HTMLInputElement).value })}
                />
              </label>
              <button
                type="button"
                class="go solid"
                disabled={result === "busy" || form.name.trim().length < 2}
                onClick={() => void send()}
              >
                {u.suggestSend}
              </button>
            </>
          )}
          {result && result !== "busy" && (
            <p class={result === "ok" ? "hk ok" : "warn"} role="status">
              {u.suggestResult[result]}
            </p>
          )}
        </div>
      )}

      <button type="button" class="rs" aria-pressed={retro} onClick={() => setRetro(!retro)}>
        {u.retro}
      </button>

      <button
        type="button"
        class="rs"
        onClick={() => setTh({ ...profile.theme, palette: null, label: undefined })}
      >
        {u.reset}
      </button>
      <p class="hk">{u.hotkeys}</p>
    </aside>
  );
}
