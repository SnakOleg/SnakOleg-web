# Assets

All SVG files live here, grouped by purpose.

| Folder          | What it holds                                                    | How it is used                   |
| --------------- | ---------------------------------------------------------------- | -------------------------------- |
| `icons/social`  | Brand glyphs for contact links                                   | `<Ico n="github" />`             |
| `icons/ui`      | Small interface glyphs (arrows, lock, clock)                     | `<Ico n="lock" />`               |
| `icons/devices` | Pictograms for the "Uses" page (devices, search, theme)          | `<Ico n="laptop" />`             |
| `icons/admin`   | Navigation glyphs of the dashboard                               | `<Ico n="overview" />`           |
| `illustrations` | Larger pictures (default avatar)                                 | imported as a URL                |
| `projects`      | Banners of project cards (also usable by URL from the dashboard) | imported in `config/projects.ts` |

Icons use `currentColor`, so they follow the text color. The file name is the icon name,
names must be unique across folders. Favicons are in `public/`.
Graphics that are generated from data (project banners, footer wordmark) are components in `src/components/graphics`.
