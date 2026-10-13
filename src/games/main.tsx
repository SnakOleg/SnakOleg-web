import "../fonts";
import { render } from "preact";
import { loadContent } from "../lib/content";
import { GamesApp } from "./GamesApp";

void loadContent().finally(() => render(<GamesApp />, document.getElementById("games")!));
