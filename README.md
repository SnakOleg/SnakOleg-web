# Snak portfolio

A one-page developer portfolio with a private dashboard. Frontend on Preact, TypeScript and SCSS, backend on Cloudflare Pages Functions with a D1 (SQLite) database. Everything fits into the free Cloudflare plan.

## What is inside

- Public page: hero, contacts, live GitHub numbers and a contribution calendar, project cards with filters, a timeline built from your repositories in three views (pulse chart with a time slider, metro map, git graph), skills, themes and RU/EN switch.
- Dashboard at `/admin`: sign in with Telegram, edit every text and list on the site, version history with rollback, visitor analytics (views, sources, countries, devices, clicks, daily details), active sessions per device and an audit log.
- No tracking cookies, no stored visitor IPs.

## Quick start

```bash
npm install
npm run dev          # public site only, http://localhost:5173
```

The dashboard needs the API and a database. See [docs/SETUP.md](docs/SETUP.md) for the local and production setup, or the step-by-step guide with a glossary in Russian: [docs/CLOUDFLARE.ru.md](docs/CLOUDFLARE.ru.md).

## Make it your own

1. Edit the files in `src/config/`: `profile.ts` (name, texts, contacts, skills), `projects.ts`, `github.ts` (which repositories feed the timeline), `ui.ts` (interface strings).
2. Put your avatar into `public/` and set `avatar` in `profile.ts`. Without it a placeholder picture is used.
3. Change the GitHub user in `src/config/github.ts` and run `npm run sync` to refresh `src/data/github.json`.
4. Replace `public/favicon.svg` and `public/favicon-admin.svg`.
5. Optional: set up the dashboard (see the setup guide), then most content can be changed from the browser.

More details in [docs/CUSTOMIZE.md](docs/CUSTOMIZE.md).

## Scripts

| Command                | What it does                                                       |
| ---------------------- | ------------------------------------------------------------------ |
| `npm run dev`          | Vite dev server for the public site                                |
| `npm run dev:api`      | Build, apply local migrations and run the full stack with Wrangler |
| `npm run build`        | Production build into `dist/`                                      |
| `npm run build:single` | One self-contained `dist/index.html` for quick previews            |
| `npm run build:demo`   | Dashboard with fake data in `dist-demo/admin.html`                 |
| `npm run sync`         | Refresh the GitHub snapshot                                        |
| `npm run check`        | Type check, lint and formatting check                              |
| `npm run live:deploy`  | Deploy the Worker for the online counter and cursors               |

## Structure

```
src/
  assets/       SVG files by category (icons/social, icons/ui, icons/admin, illustrations)
  components/   page sections, charts, graphics generated from data
  config/       all default content
  data/         GitHub snapshot written by npm run sync
  hooks/        small reusable hooks
  lib/          helpers (i18n, GitHub nodes, content loading, tracking)
  styles/       SCSS partials
  admin/        dashboard (pages, charts, schema driven editor)
  live/         online counter and cursors (client side)
functions/api/  backend endpoints (auth, content, track, blog, admin, live)
realtime/       Worker with the Durable Object for live presence
tests/          unit and integration tests
shared/         code used by both frontend and backend
migrations/     D1 schema
scripts/        sync-github.mjs
docs/           setup and customization guides
```

## Hidden entry to the dashboard

There is no visible link. Type `admin` anywhere on the page (outside of input fields) or triple click the copyright line in the footer. The dashboard itself stays protected by the Telegram sign in, the link is only a shortcut.

## Search and sharing

At build time the site gets meta tags, Open Graph and Twitter cards, structured data for a person, `sitemap.xml` and `robots.txt`. The address comes from the `SITE_URL` variable (default in `src/config/seo.ts`), set it to your real domain in the Cloudflare Pages variables. The preview card used when the link is shared is `public/og.jpg` (1200 x 630), replace it with your own picture. Unknown addresses show `public/404.html`.

## Project pages

A project card opens a detail window with a longer text, your role, the repository and GitHub numbers. The address of an open window is `/#/p/<name>`, so it can be shared. Texts, role, repository and banner are edited in the dashboard (Content, Projects).

## Extra pages and fun

- `/uses` is the "My setup" page: a glass desktop in the spirit of macOS 27 Golden Gate with draggable windows, a Dock and a Spotlight style search (`/` or Ctrl+K). Devices, specs and apps are edited in the dashboard (Content, "Мой стек").
- The 404 page hides a small snake game ("catch the bugs").
- Weather: rain, snow, fog, clouds and thunderstorms drawn on a canvas behind the content. Drops splash on the top edges of cards, snow piles up on them, the cursor works as an umbrella. "Like outside" asks `/api/weather`, which reads the visitor's city from Cloudflare and asks Open-Meteo from the server (cached for 15 minutes). Visitors can pick any weather or turn it off in the settings panel.
- Holidays by calendar: a garland and snow for New Year, bats and a cobweb for Halloween, hearts for Valentine's Day. Can be previewed or turned off in the settings panel. With "reduce motion" on, the automatic effects stay off.
- Live presence: online counter at the bottom left and anonymous cursors of people on the same page (see docs/SETUP.md, 4.1).
- Terminal: press the `key (the letter ё on a Russian layout) or the`>_`button in the footer. It knows`help`, `ls`, `cat`, `cd`, `theme`, `lang`, `weather`, `open` and a handful of hidden commands.
- Passport: every easter egg gives a stamp (terminal commands, the Konami code, typing the name, the night owl, and more). Stamps are kept in the browser and, for visitors signed in with Telegram, in the `stamps` table. Eggs are listed in `shared/stamps.ts`; the browser reports them and the server accepts only ids from that list, so a stamp is a keepsake and not a proof of anything.
- Visitors map: countries on the home page glow by number of visits, outlined ones have sent postcards. Postcards are guestbook entries with a stamp and the sender's country.
- Games (`/games`, footer, or `word`, `reaction`, `garden`, `capsule` in the terminal), each on its own page: word of the day with a streak and emoji share, reaction test with a leaderboard, a shared garden scene where visitors water each other's plants, and time capsules frozen in a cryo bay until a chosen date.
- Status: write `/now` to the Telegram bot and the footer shows what you are doing (see docs/SETUP.md).
- Themes: visitors can pick a ready palette or build their own from five colors in the settings panel. Palettes with unreadable text are flagged. A visitor can suggest a palette, it appears for everyone only after you approve it in the dashboard ("Темы"). Limits: 5 suggestions an hour per address, 100 waiting, 300 stored.
- The 2003 mode (Konami code, or "Режим 2003" in the settings panel) rebuilds the page as an old personal homepage: scanlines, neon grid, a marquee, 88x31 buttons, sparkles behind the pointer and a visitor counter that shows the real number of page views.

## License

[MIT](LICENSE). You may use and change the code, but the copyright line and the license text must stay in every copy, so the author (SnakOleg) is credited. Fonts and libraries keep their own licenses.
