# Setup guide

This guide takes you from a fresh clone to a deployed site with a working dashboard. You need a free Cloudflare account, a GitHub account and a Telegram account.

## 1. Variables and keys

| Name                       | Where to set                        | Secret | What it is                                                                                  |
| -------------------------- | ----------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `TG_CLIENT_ID`             | Cloudflare Pages variable           | no     | Client ID shown in BotFather under Web Login. It is the numeric id of your bot              |
| `TG_CLIENT_SECRET`         | Cloudflare Pages secret             | yes    | Client secret from the same BotFather screen. This is not the bot token                     |
| `ADMIN_TG_ID`              | Cloudflare Pages variable           | no     | Numeric Telegram id of the owner. Several ids can be separated by commas                    |
| `SESSION_SECRET`           | Cloudflare Pages secret             | yes    | Random string, at least 32 characters. Signs the session cookie                             |
| `STATS_TZ`                 | `wrangler.toml`, section `[vars]`   | no     | IANA time zone used to split statistics into days and hours, for example `Europe/Amsterdam` |
| `GITHUB_TOKEN`             | your shell, only for `npm run sync` | yes    | Optional. Raises the GitHub API limit and allows reading private repositories               |
| `GH_USER`, `GH_SINCE_YEAR` | your shell, only for `npm run sync` | no     | Optional overrides for the sync script                                                      |
| `INCLUDE_PRIVATE`          | your shell, only for `npm run sync` | no     | Comma separated names of private repositories that may appear in the snapshot               |

Generate the session secret with `openssl rand -base64 48`.

Never publish the bot token, the client secret, the session secret or a GitHub token. The dashboard does not need the bot token at all. If a token ever ends up in a chat, a screenshot or a commit, revoke it right away (BotFather: `/mybots`, pick the bot, API Token, Revoke current token).

## 2. Telegram sign in

1. Open @BotFather and create a bot with `/newbot`, or pick an existing one.
2. Bot Settings, Web Login (OpenID Connect). In Allowed URLs add two kinds of addresses for every domain you will use: the site origin (`https://YOUR-SITE.pages.dev`) and the exact callback (`https://YOUR-SITE.pages.dev/api/auth/callback`). Telegram only processes logins and redirects for pre-registered URLs.
3. Copy the Client ID and Client Secret that BotFather shows there.
4. Find your numeric Telegram id. The easiest way: try to sign in once. If your id is not allowed yet, the page that opens prints it. Put that number into `ADMIN_TG_ID`.

If Telegram answers `origin required`, it did not recognise the request as an OIDC login. Check that Web Login is enabled for the bot, that both URLs above are registered for the domain you are testing on, and that `TG_CLIENT_ID` equals the Client ID from BotFather. Telegram may refuse plain `http://localhost` addresses, in that case test on the deployed domain.

## Callbacks and allowed URLs

The sign in flow has three steps. `/api/auth/login` sends the browser to Telegram, Telegram sends it back to `/api/auth/callback` with a one-time code, and the callback exchanges the code (using the client secret, on the server) for an identity token and starts the session.

| Where                              | What to enter                                                                     | Why                                                                                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BotFather, Web Login, Allowed URLs | `https://YOUR-SITE.pages.dev` and `https://YOUR-SITE.pages.dev/api/auth/callback` | Telegram only works with origins and redirect URLs registered in advance                                                                                                     |
| BotFather, custom domain           | the same two lines with your own domain                                           | Every domain needs its own pair, `www.` and the bare domain count as different sites                                                                                         |
| BotFather, local run               | `http://localhost:8788` and `http://localhost:8788/api/auth/callback`             | Telegram may refuse plain http, in that case test on the deployed site                                                                                                       |
| Cloudflare Pages                   | nothing for sign in                                                               | The callback is an ordinary route of the site (`functions/api/auth/callback.ts`)                                                                                             |
| Code                               | nothing                                                                           | `login.ts` builds the redirect address from the address the visitor used, `callback.ts` sends the same value back to Telegram, so open `/admin` on the domain you registered |
| GitHub                             | nothing                                                                           | The sync script reads public pages and the public API                                                                                                                        |

Preview deployments (`abc123.YOUR-SITE.pages.dev`) are different addresses, so signing in there needs each of them registered. Use the production domain for the dashboard.

## 3. Database

```bash
npx wrangler login
npx wrangler d1 create snak-db
```

Copy the printed `database_id` into `wrangler.toml`, then create the tables:

```bash
npm run db:migrate
```

Run the same command after pulling updates that add files to `migrations/`.

## 4. Deploy to Cloudflare Pages

1. Push the repository to GitHub.
2. Cloudflare dashboard, Workers and Pages, Create, Pages, Connect to Git, choose the repository.
3. Build command `npm run build`, output directory `dist`.
4. Settings, Bindings: check that the D1 binding named `DB` points to `snak-db` (add it if it is missing).
5. Settings, Variables and Secrets: add the four variables from the table above for the Production environment, then redeploy.
6. Open `/admin` and sign in.

## 5. Local development with the dashboard

```bash
cp .dev.vars.example .dev.vars    # fill in the values, never commit this file
npm run dev:api                   # builds, applies local migrations, starts http://localhost:8788
```

`dev:api` applies the migrations to the local database every time, so a fresh clone works without extra steps. If you see `no such table`, the migrations have not been applied to the database that Wrangler is using: run `npm run db:migrate:local`.

## 6. GitHub numbers and timeline

The public page reads `src/data/github.json`. Refresh it when you want new numbers:

```bash
npm run sync
```

The contribution calendar is read from the public profile page, it includes private work if your profile shows private contributions, and it needs no token. Repository details come from the GitHub API. Without a token the API allows 60 requests per hour, which is enough for a few repositories. In the browser the timeline also refreshes hashes and dates live when the API answers.

Choose which repositories appear in `src/config/github.ts` or from the dashboard (Content, Timeline).

## 7. Limits of the free plan

At the time of writing: 100 000 function requests per day, D1 with 5 GB of storage, 5 million rows read and 100 000 rows written per day. Static files are not counted. The tracker stops counting at 4000 views per day so the dashboard keeps working. Check the current numbers in the Cloudflare documentation before relying on them.

## 8. Security notes

- The dashboard page is static and contains no secrets. Every action goes through the API, which checks the signed session cookie, the allow list of Telegram ids, the live session record and, for writes, the request origin and a custom header.
- Sessions live 8 hours. The Security page lists every session with IP, place and device, can end any of them, flags unusual ones and can block an address.
- A session is marked suspicious in two cases: both the IP and the country changed during the session (a stolen cookie looks like this), or the device is new (another system, browser or device type than in earlier sessions) and the country is new too. Single signals only give yellow hints. The device is read from the User-Agent header, it is not a precise browser fingerprint.
- Any foreign address can be blocked from the device list. Your own address cannot be blocked. A blocked address gets a "Доступ закрыт" page when it tries to sign in, the public site stays reachable.
- Content saved from the dashboard is validated (size, depth, allowed link schemes) and versioned.
- Link clicks are counted once per visitor and link per day, so repeated taps (for example on a slow connection) change nothing. Limits per visitor (20 page views and 40 different links a day), a daily cap for views and clicks, a cap on distinct link names and a strict name format keep the numbers from being inflated or filled with junk.
- The visitor counter keeps daily totals only. To count unique people it stores an irreversible hash for about two days.
- Optional extra layer: put Cloudflare Access in front of `/admin*` and `/api/admin/*`.

## Troubleshooting

| Problem                                | Fix                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `no such table`                        | Apply migrations: `npm run db:migrate:local` locally or `npm run db:migrate` for production |
| "Access denied" after Telegram sign in | The id printed on the page is not in `ADMIN_TG_ID`                                          |
| Sign in loops back to the login page   | Cookie is blocked: the site must be served over https (or localhost)                        |
| Statistics are empty                   | Open the public page in a normal browser window, bots and Do Not Track are ignored          |
| Redirect error from Telegram           | The redirect URL in BotFather must match the address exactly                                |

## Before you make the repository public

1. Look through the whole history, not only the latest files: `git log -p | grep -iE "secret|token|password|api[_-]?key"`. A secret that was committed once stays in the history even after the file is changed. If one ever got in, revoke it and rewrite the history or start a fresh repository.
2. Make sure `.dev.vars` is not tracked: `git ls-files | grep dev.vars` must print nothing.
3. Check that `src/config/*` contains only information you want to show (contacts, links, texts).
4. A D1 `database_id` in `wrangler.toml` is not a secret, it is useless without your Cloudflare account. Variables from the Cloudflare panel never end up in the repository.
5. Add a license file so others know how they may use the code.
6. The dashboard code being visible is fine: its protection is the Telegram sign in, the allow list and the server checks, not hidden source code.

A private repository works the same way with Cloudflare Pages, you only grant Cloudflare access to it during the Git connection step.

## Tests

```bash
npm test
```

The unit tests cover tokens, content validation, dates and device parsing. The integration tests start the real API (`wrangler pages dev`) on a throw-away local database and check sign-in protection, CSRF, content versions, sessions and blocking, the visitor counter limits, the link checker and the status endpoint. They need `dist/` (the command builds it when it is missing) and about a minute.

## Link checker and notifications

- Overview, "Проверка ссылок": the server opens every link of the site and reports the answer. Sites that block automated requests are shown as "не проверить", that is not an error.
- With `TG_BOT_TOKEN` set, the dashboard sends a Telegram message when someone signs in from a new device or country, and (at most three times an hour) when a foreign Telegram account tries to sign in. Without the variable nothing is sent.

## Mini blog and community

The blog lives at `/blog` (a short preview with a button is shown on the home page). Everything is managed in the dashboard.

- **Blog**: write posts in Markdown (headings, lists, tables, code with highlighting, callouts `> [!TIP]`, spoilers `||text||`, images). The editor has a toolbar and a live preview; Ctrl+S saves, drafts of new posts are kept in the browser. Posts can be pinned, scheduled for a later date and closed for comments. An RSS feed is served at `/blog/rss.xml` and every post has its own link preview.
- **Posting from the blog page**: when you sign in on `/blog` with your own Telegram account, a "Что нового?" bar appears above the feed and every post has a "..." menu (edit, pin, delete). The editor there has Markdown, a preview, tags, a cover and a draft button. Scheduling a post for later is done in the dashboard. At most three posts can be pinned; they stay on top, newest first.
- **Moderation on the page**: signed in as the owner you get a "..." menu on every comment: hide, delete, mark as not spam and ban the author (with a reason, a term and an option to delete all their comments). A person cannot be banned twice for the same scope, lift the old ban first.
- **Threads**: replies are nested under the comment they answer, with a curved thread line. Hiding or deleting a comment removes its replies too. Comments can be sorted by newest, top or oldest. A comment the owner reacted to is highlighted and marked "Автору понравилось".
- **Who reacted**: the owner can click the view counter of a post to see who reacted, with which emoji and when.
- **Many topics**: the sidebar shows the twenty most used topics, the rest opens in a searchable list.
- **Visitors sign in with Telegram** through the same `/api/auth/callback`. **No extra Allowed URL is needed**: the sign-in uses the origin and callback you registered for the dashboard. Visitors can comment, reply, react (up to 3 reactions per item), report and share.
- **Community**: moderation of comments (filters: possible spam, on review, reported), users (ban, trust (the person's comments skip premoderation), erase comments, delete account), bans (with lifting) and rules (comments on/off, pause between comments, comments per day, premoderation of newcomers, theme suggestions per day).
- **Protections**: pause between comments, daily limit, per-IP limit, duplicate and copy detection, scoring for links, invites, ads, abuse and CAPS. Suspicious comments are labelled "Возможный спам" and the text is not sent to the browser until the visitor presses "Всё равно показать"; links inside stay inactive. A report asks for a reason first. Three reports from different people flag a comment automatically. You (any id in `ADMIN_TG_ID`) are never limited and cannot be banned.
- **Bans**: scope is blog, themes or everything, for 1, 7 or 30 days or forever, with a reason shown to the person together with your contact (@The_Nikeri) so they can write to you. The "Темы" page also has a "Заблокировать автора" button.
- With `TG_BOT_TOKEN` set you get a Telegram message about new comments that need your attention. Without it nothing is sent.

## Announcements

Dashboard, Content, Announces: a centered notice or a running line (бегущая строка) at the top of every page, with colors, dates and the option to dismiss.

## Fonts and 2003 mode

The customizer has a font switcher (the fonts are bundled, no external hosts). The 2003 mode (Konami code or the switch in the customizer) has a dial-up screen, a bouncing logo, a web ring, a guestbook link to the blog and Windows 95 style cards.

## Themes from visitors

Suggestions arrive through `POST /api/presets` and wait in the `presets` table until you approve them on the "Темы" page. The text is cleaned (no markup), the colors are checked for contrast on the server too, and exact duplicates are refused. Accepting can be switched off in Content, Оформление ("Принимать темы от посетителей"). Approved themes are cached for a few minutes. Suggesting a theme requires a Telegram sign-in, so you can block abusers per person (see "Community" below). The migrations `0003` to `0007` (history notes, click limits, presets, blog, community and replies) are applied by `npm run db:migrate`.
