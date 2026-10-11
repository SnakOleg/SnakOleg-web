import { profile } from "./profile";
import { projects } from "./projects";
import { announce } from "./announce";
import { uses } from "./uses";
import { ui } from "./ui";
import { github } from "./github";

export const site = { ...profile, projects, uses, announce, ui, github };
export type { T } from "./i18n";
