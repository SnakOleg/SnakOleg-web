import "./fonts";
import { render } from "preact";
import { App } from "./App";
import { applyContent, loadContent } from "./lib/content";
import { startTracking } from "./lib/track";

const root = document.getElementById("app")!;
const preview = new URLSearchParams(location.search).has("preview") && parent !== window;
let version = 0;

const mount = () => render(<App key={version++} preview={preview} />, root);

void loadContent().finally(() => {
  mount();
  if (!preview) startTracking();
});

if (preview) {
  addEventListener("message", (e) => {
    if (e.origin !== location.origin || e.data?.type !== "snak-preview") return;
    applyContent(e.data.content);
    mount();
  });
}
