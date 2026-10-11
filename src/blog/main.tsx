import "../fonts";
import { render } from "preact";
import { loadContent } from "../lib/content";
import { Blog } from "./Blog";

void loadContent().finally(() => render(<Blog />, document.getElementById("blog")!));
