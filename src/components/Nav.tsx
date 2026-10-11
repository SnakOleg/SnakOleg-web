import type { Ref } from "preact";
import { site } from "../config";
import type { L } from "../lib/i18n";
import { Ico } from "./ui/Icon";

type Props = {
  l: L;
  setL: (l: L) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  gearRef: Ref<HTMLButtonElement>;
  page?: "home" | "uses" | "blog";
};

export function Nav({ l, setL, open, setOpen, gearRef, page = "home" }: Props) {
  const u = site.ui[l];
  const h = page === "home" ? "" : "/";
  return (
    <nav class="nav">
      <a class="brand" href="/" aria-label="Snak / Oleg">
        <b>
          Snak <span>/ Oleg</span>
        </b>
      </a>
      <a class="anc" href={h + "#projects"}>
        {u.navProjects}
      </a>
      <a class="anc" href={h + "#timeline"}>
        {u.timeline}
      </a>
      <a href="/blog" aria-current={page === "blog" ? "page" : undefined}>
        {u.blogNav}
      </a>
      <a href="/uses" aria-current={page === "uses" ? "page" : undefined}>
        {u.usesNav}
      </a>
      <button type="button" onClick={() => setL(l === "ru" ? "en" : "ru")}>
        {l === "ru" ? "EN" : "RU"}
      </button>
      <button
        type="button"
        ref={gearRef}
        aria-label="Customize"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Ico n="sliders" />
      </button>
    </nav>
  );
}
