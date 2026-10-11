# Customization

## Content

All defaults live in `src/config/`. The dashboard stores edits in the database and applies them on top of these defaults, so the files are always a safe fallback.

| File          | Holds                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| `profile.ts`  | name, greeting, rotating roles, about text, WakaTime link, contacts, hard and soft skills                     |
| `projects.ts` | project cards: kind (`order`, `personal`, `team`), state (`active`, `done`, `paused`, `archive`), tags, links |
| `github.ts`   | GitHub user, which repositories feed the timeline, branch lanes, manual events                                |
| `ui.ts`       | interface strings in both languages                                                                           |
| `announce.ts` | notices and the running line (also editable in the dashboard)                                                 |
| `uses.ts`     | devices and software for the `/uses` page                                                                     |
| `i18n.ts`     | the `t("ru", "en")` helper                                                                                    |

Every text field accepts either a plain string or `t("ru", "en")`.

## Images

- Avatar: put a file into `public/` and set `avatar: "/your-file.webp"` in `profile.ts`.
- Project banner: set `img` on the project, otherwise a gradient banner with the `glyph` is generated.

## Colors and theme

Tokens are at the top of `src/styles/_tokens.scss`. The accent color is driven by one number, `--h` (hue). Visitors can change theme and accent from the gear button, and the default can be set in the dashboard (Content, Theme).

## Icons

SVG files are grouped in `src/assets/icons/`. The file name is the icon name, so `github.svg` is used as `<Ico n="github" />` and as `icon: "github"` in contacts. Add a file and it becomes available. See `src/assets/README.md`.

## Adding a field to the dashboard

Every editable section is described in `src/admin/schema.ts`. Add one line to the section, read the value in the component, and the generic editor will render the input.

## Translations

The interface supports two languages. Add keys to both objects in `src/config/ui.ts`. To add another language, extend the `L` type in `src/lib/i18n.ts` and the `T` type in `src/config/i18n.ts`.

## Fonts

The font pair is chosen by visitors in the customizer (`data-font` on `<html>`). Fonts are installed from `@fontsource` and imported in `src/fonts.ts`, so nothing is loaded from external hosts. To add a pair, import its weights there, add a `[data-font="..."]` block in `src/styles/_tokens.scss` and a label in `ui.ts`.

## Blog styling

Markdown styles are shared by the public blog and the dashboard preview in `src/styles/_md.scss`. Blog layout is in `src/blog/blog.scss`.
