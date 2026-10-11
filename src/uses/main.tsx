import "../fonts";
import { render } from "preact";
import { loadContent } from "../lib/content";
import { Uses } from "./Uses";

void loadContent().finally(() => render(<Uses />, document.getElementById("uses")!));
