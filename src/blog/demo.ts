// In-memory copy of the blog API, used by the preview build (VITE_BLOG_DEMO) so the blog can be tried without a server.
import {
  COMMENT_MAX,
  EMOJI,
  GUESTBOOK,
  GUESTBOOK_MAX,
  MAX_REACTIONS_PER_TARGET,
  cleanText,
  excerptOf,
} from "../../shared/blog";
import { isSpam, scoreComment } from "../../shared/spam";
import { KNOWN } from "../../shared/dictionary";
import { WORD_TRIES, dayNumber, normalize, score, validGuess, wordOf } from "../../shared/words";
import type { Cmt, CUser, Me, PostFull } from "./api";

const now = Date.now();
const H = 3600_000;
const OWNER: CUser = { id: "1", name: "Snak", username: "The_Nikeri", picture: "", owner: true };
const ALICE: CUser = { id: "7001", name: "Alice", username: "alice", picture: "", owner: false };
const BOB: CUser = { id: "7003", name: "Bob", username: "bob_dev", picture: "", owner: false };
const GUEST: CUser = { id: "9000", name: "Гость демо", username: "demo", picture: "", owner: false };

const cover = (a: number, b: number) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='520' viewBox='0 0 1200 520'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${a} 70% 45%)'/><stop offset='1' stop-color='hsl(${b} 70% 30%)'/></linearGradient></defs><rect width='1200' height='520' fill='url(#g)'/><g fill='none' stroke='#fff' stroke-opacity='.18'>${Array.from({ length: 9 }, (_, i) => `<circle cx='${900 + i * 6}' cy='120' r='${40 + i * 28}'/>`).join("")}</g></svg>`,
  );

const posts: PostFull[] = [
  {
    id: 3,
    title: "Как я сделал блог на Cloudflare D1 за один вечер",
    excerpt: "",
    tags: ["cloudflare", "код"],
    cover: cover(255, 300),
    pinned: true,
    pub: now - 3 * H,
    views: 412,
    comments: 0,
    reactions: { "🔥": 18, "❤️": 7, "👍": 11 },
    mine: [],
    commentsOpen: true,
    body: `# Как я сделал блог за вечер

Это **демо-пост**: посмотри, что умеет разметка. Весь блог пишется в Markdown, поэтому оформление в твоих руках.

> [!TIP]
> Блоки-подсказки пишутся как \`> [!TIP]\`. Есть ещё NOTE, WARNING, IMPORTANT и QUOTE.

## Что внутри

- Посты и комментарии лежат в **D1** (SQLite)
- Вход через ==Telegram==, без паролей
- Защита от спама: комментарий с подозрением скрывается за кнопкой

> [!WARNING]
> Секреты вроде токенов бота никогда не кладите в репозиторий.

## Код с подсветкой

\`\`\`ts
export async function onRequestGet({ env }: { env: Env }) {
  const { results } = await env.DB.prepare("SELECT * FROM posts LIMIT 10").all();
  return Response.json(results);
}
\`\`\`

## Таблица

| Что | Где |
| --- | --- |
| Посты | D1 |
| Файлы | Pages |
| Вход | Telegram OIDC |

А ещё есть спойлеры: ||концовка фильма||. Попробуй нажать.

### Итог

Получилась «соцсеть для одного человека». Остальное смотри в комментариях.`,
  },
  {
    id: 2,
    title: "Три мелочи, которые делают сайт живее",
    excerpt: "",
    tags: ["дизайн", "код"],
    cover: "",
    pinned: false,
    pub: now - 2 * 864e5,
    views: 233,
    comments: 0,
    reactions: { "👍": 9, "🎉": 2 },
    mine: [],
    commentsOpen: true,
    body: `Небольшие детали решают много.

1. Свечение у курсора вместо рамки
2. Плавные числа в счётчиках
3. Сканлайны в режиме 2003

> [!NOTE]
> Режим 2003 включается кодом Konami или в панели настроек.`,
  },
  {
    id: 1,
    title: "Привет, это мой блог",
    excerpt: "",
    tags: ["личное"],
    cover: "",
    pinned: false,
    pub: now - 9 * 864e5,
    views: 98,
    comments: 0,
    reactions: { "❤️": 4 },
    mine: [],
    commentsOpen: true,
    body: "Здесь будут заметки о том, что я делаю. Заходи, читай, пиши в комментариях.",
  },
];
for (const p of posts) p.excerpt = excerptOf(p.body);

let nextId = 100;
const owned = new Set<string>(["guest"]);
const store: Record<number, (Cmt & { post: number; text: string })[]> = {};
const c = (post: number, id: number, user: CUser, text: string, ago: number, extra: Partial<Cmt> = {}) => {
  const v = scoreComment(text);
  (store[post] ??= []).push({
    id,
    post,
    parent: null,
    to: null,
    byOwner: [],
    user,
    text,
    body: isSpam(v) ? "" : text,
    flagged: isSpam(v),
    deleted: false,
    pending: false,
    created: now - ago,
    edited: null,
    own: false,
    reactions: {},
    mine: [],
    ...extra,
  });
};
c(3, 1, ALICE, "Классный разбор! А как с лимитами D1 на бесплатном тарифе?", 2 * H, {
  reactions: { "👍": 3 },
  byOwner: ["❤️"],
});
c(
  3,
  2,
  OWNER,
  "Спасибо! Для личного сайта лимитов с запасом хватает, считаю запросы раз в день.",
  H + 20 * 60_000,
  { parent: 1, to: 1, reactions: { "❤️": 1 } },
);
c(3, 6, BOB, "А если запросов станет сильно больше?", 55 * 60_000, { parent: 1, to: 2 });
c(3, 7, ALICE, "Тогда кеш на уровне Pages и счётчики раз в минуту.", 40 * 60_000, { parent: 1, to: 6 });
c(3, 8, OWNER, "Именно так, плюс не читаем лишнее.", 35 * 60_000, { parent: 1, to: 7, byOwner: [] });
c(3, 3, BOB, "Заработок без вложений!!! Пиши сюда t.me/+AbCdEf казино бонус", 50 * 60_000);
c(3, 4, BOB, "Спойлер уже кликнул, не жалею ||ха||", 30 * 60_000);
c(2, 5, ALICE, "Свечение у карточек огонь", 5 * H);

const CARL: CUser = { id: "7005", name: "Carl", username: "carl_k", picture: "", owner: false };
const DINA: CUser = { id: "7006", name: "Dina", username: "", picture: "", owner: false };
type Liker = { user: CUser; emoji: string; created: number };
const likers: Record<number, Liker[]> = {
  3: [
    { user: ALICE, emoji: "❤️", created: now - 44 * 60_000 },
    { user: CARL, emoji: "🔥", created: now - 2 * H },
    { user: BOB, emoji: "👍", created: now - 5 * H },
    { user: DINA, emoji: "🔥", created: now - 26 * H },
  ],
  2: [{ user: DINA, emoji: "👍", created: now - 3 * H }],
};

c(0, 11, CARL, "Зашёл по ссылке из телеги, сайт классный. Тема с подсветкой кода огонь.", 3 * H, {
  reactions: { "🔥": 4, "❤️": 2 },
});
c(0, 12, OWNER, "Спасибо, что заглянули! Пишите, что понравилось и чего не хватает.", 26 * H, {
  pinned: true,
  reactions: { "❤️": 5 },
});
c(0, 13, DINA, "Привет из Питера!", 50 * H, { reactions: { "👍": 1 } });
c(0, 14, CARL, "Привет из Берлина! Хорошего лета вам.", 70 * H, { card: { icon: "sun", c: "DE" } });

const closeThread = (id: number, deleted: boolean) => {
  const all = Object.values(store).flat();
  const gone = new Set([id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const x of all) {
      const up = x.to ?? x.parent;
      if (!gone.has(x.id) && up && gone.has(up)) (gone.add(x.id), (grew = true));
    }
  }
  for (const x of all) if (gone.has(x.id)) Object.assign(x, { deleted, body: "", user: null });
};

let user: CUser | null = new URLSearchParams(location.search).has("as") ? GUEST : null;
let banned = false;
let last = 0;

const withCounts = (p: PostFull) => ({
  ...p,
  comments: (store[p.id] ?? []).filter((x) => !x.deleted).length,
});
const brief = (p: PostFull) => {
  const { body: _b, commentsOpen: _c, ...rest } = withCounts(p);
  return rest;
};
const ok = <T>(data: T, status = 200) => ({ ok: status < 400, status, data });

export const demoLogin = (on = true, owner = false) => {
  user = on ? (owner ? OWNER : GUEST) : null;
};
export const demoBan = (on: boolean) => {
  banned = on;
};

const sealedDemo: number[] = [];
let plant = null as {
  kind: string;
  stage: number;
  day: number;
  loc: string;
  color: number;
  deco: string;
} | null;
const gifted = new Set<string>();
const DEMO_NAMES = [
  "Дина",
  "Карл",
  "Alice",
  "Bob",
  "Snak",
  "Мария",
  "Иван",
  "Лена",
  "Макс",
  "Оля",
  "Вера",
  "Тимур",
];
const DEMO_KINDS = ["sunflower", "tulip", "cactus", "tree", "mushroom", "rose", "pumpkin", "lavender"];
const DEMO_DECOS = ["", "sign", "", "gnome", "", "lantern", "pinwheel", "", "birdhouse", "fence"];
const gardenLocs = ["meadow", "pond", "orchard", "forest"];
const demoPlants = (loc: string) => {
  const k = gardenLocs.indexOf(loc) + 1;
  return Array.from({ length: 10 + k * 3 }, (_, i) => ({
    id: `${loc}-${i}`,
    kind: DEMO_KINDS[(i * 3 + k) % DEMO_KINDS.length]!,
    stage: (i * 7 + k) % 5,
    gifts: (i * 5) % 4,
    color: (i + k) % 7,
    deco: DEMO_DECOS[(i + k * 2) % DEMO_DECOS.length]!,
    name: DEMO_NAMES[(i + k) % DEMO_NAMES.length]!,
    own: false,
    given: gifted.has(`${loc}-${i}`),
  }));
};
const gardenList = (loc: string) => [
  ...(plant && plant.loc === loc
    ? [
        {
          id: "9000",
          kind: plant.kind,
          stage: plant.stage,
          gifts: 0,
          color: plant.color,
          deco: plant.deco,
          name: "Гость демо",
          own: true,
          given: false,
        },
      ]
    : []),
  ...demoPlants(loc),
];
const gardenMine = () =>
  plant
    ? {
        kind: plant.kind,
        stage: plant.stage,
        can: plant.stage < 4 && plant.day !== 1,
        loc: plant.loc,
        color: plant.color,
        deco: plant.deco,
      }
    : null;

export function demoApi(path: string, method: string, body?: any) {
  const url = new URL(path, "http://x");
  const p = url.pathname;
  const q = url.searchParams;

  if (p === "/api/user/me") {
    if (method === "DELETE") {
      user = null;
      return ok({ ok: true });
    }
    const me: Me = {
      user,
      bans: user
        ? { blog: banned ? { reason: "Реклама в комментариях", until: null } : null, themes: null }
        : undefined,
      settings: { commentsOpen: true, slowMode: 3, themesOpen: true },
    };
    return ok(me);
  }
  if (p === "/api/now")
    return ok({ now: { icon: "💻", ru: "Пишу код", en: "Writing code", ts: Date.now() - 20 * 60_000 } });
  if (p === "/api/garden" && method === "GET") {
    const loc = gardenLocs.includes(q.get("loc") ?? "") ? q.get("loc")! : "meadow";
    return ok({
      loc,
      counts: Object.fromEntries(gardenLocs.map((x) => [x, gardenList(x).length])),
      plants: gardenList(loc),
      mine: gardenMine(),
      giftsLeft: 5 - gifted.size,
    });
  }
  if (p === "/api/capsule" && method === "GET")
    return ok({
      vault: [
        { opens: Date.now() + 9 * 86_400_000, name: "Дина" },
        { opens: Date.now() + 40 * 86_400_000, name: "Карл" },
        { opens: Date.now() - 1000, name: "Alice" },
        ...sealedDemo.map((o) => ({ opens: o, name: "Гость демо" })),
      ].sort((a, b) => a.opens - b.opens),
      total: 3 + sealedDemo.length,
      mine: sealedDemo.map((o, i) => ({ id: i + 1, created: Date.now(), opens: o, opened: null })),
    });
  if (p === "/api/game" && method === "GET") {
    if (q.get("kind") === "quick")
      return ok({
        t: Date.now(),
        top: [
          { ms: 187, name: "Дина", picture: "" },
          { ms: 214, name: "Карл", picture: "" },
        ],
        week: [
          { ms: 203, name: "Вера", picture: "" },
          { ms: 231, name: "Тимур", picture: "" },
        ],
        champion: { ms: 192, name: "Дина", picture: "" },
        mine: null,
      });
    const day = dayNumber();
    const g = normalize(q.get("g"));
    if (q.get("g") === null) return ok({ day, streak: 0 });
    if (!validGuess(g)) return ok({ error: "invalid" }, 400);
    if (!KNOWN.has(g)) return ok({ error: "unknown" }, 422);
    const answer = wordOf(day);
    const pat = score(g, answer);
    const over = pat === "ggggg" || Number(q.get("n")) >= WORD_TRIES;
    return ok({ day, p: pat, ...(over ? { answer } : {}) });
  }
  if (p === "/api/game") return ok({ streak: 1, best: 200, added: [] });
  if (p === "/api/garden") {
    if (body?.action === "plant")
      plant = { kind: body.kind, stage: 0, day: -1, loc: body.loc, color: body.color, deco: body.deco };
    if (body?.action === "style" && plant) plant = { ...plant, color: body.color, deco: body.deco };
    if (body?.action === "gift") {
      if (gifted.has(body.target)) return ok({ error: "already" }, 409);
      if (gifted.size >= 5) return ok({ error: "done" }, 409);
      gifted.add(body.target);
    }
    if (body?.action === "water" && plant) plant = { ...plant, stage: Math.min(4, plant.stage + 1), day: 1 };
    if (body?.action === "dig") plant = null;
    return ok({ ok: true, added: body?.action === "plant" ? ["gardener"] : [] }, 201);
  }
  if (p === "/api/capsule") {
    if (typeof body?.opens === "number") {
      if (sealedDemo.length >= 3) return ok({ error: "limit" }, 409);
      sealedDemo.push(body.opens);
    }
    return ok({ capsule: { id: 1, created: Date.now(), opens: body?.opens, opened: null }, added: [] }, 201);
  }
  if (p === "/api/user/logout") {
    user = null;
    return ok({ ok: true });
  }

  if (p === "/api/blog/posts") {
    let list = posts.filter(
      (x) =>
        (!q.get("tag") || x.tags.includes(q.get("tag")!)) &&
        (!q.get("q") || (x.title + x.body).toLowerCase().includes(q.get("q")!.toLowerCase())),
    );
    list = [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.pub - a.pub);
    const tags = new Map<string, number>();
    for (const x of posts) for (const t of x.tags) tags.set(t, (tags.get(t) ?? 0) + 1);
    const extra = [
      "vite",
      "preact",
      "боты",
      "discord",
      "css",
      "git",
      "api",
      "sql",
      "тесты",
      "деплой",
      "линтер",
      "заметки",
      "игры",
      "музыка",
      "железо",
      "мак",
      "linux",
      "сеть",
      "безопасность",
      "дизайн-системы",
      "анимации",
      "доступность",
      "seo",
      "pwa",
    ];
    extra.forEach((t, i) => tags.set(t, tags.get(t) ?? 1 + (i % 3)));
    return ok({ posts: list.map(brief), next: null, tags: [...tags].sort((a, b) => b[1] - a[1]) });
  }
  const one = /^\/api\/blog\/posts\/(\d+)$/.exec(p);
  if (one) {
    const i = posts.findIndex((x) => x.id === Number(one[1]));
    if (i < 0) return ok({ error: "not_found" }, 404);
    const sorted = [...posts].sort((a, b) => b.pub - a.pub);
    const k = sorted.findIndex((x) => x.id === posts[i].id);
    return ok({
      post: withCounts(posts[i]),
      prev: sorted[k + 1] && { id: sorted[k + 1].id, title: sorted[k + 1].title },
      next: sorted[k - 1] && { id: sorted[k - 1].id, title: sorted[k - 1].title },
    });
  }
  if (p === "/api/blog/view") return ok({ ok: true });

  if (p === "/api/stamps" && method === "GET")
    return ok({ stamps: user ? [...owned].map((code) => ({ code, created: Date.now() })) : [] });

  if (p === "/api/blog/comments" && method === "GET") {
    const list = (store[Number(q.get("post"))] ?? []).map(({ post: _p, text: _t, ...rest }) => ({
      ...rest,
      body: rest.flagged ? "" : rest.body,
      own: rest.user?.id === user?.id && !!user,
    }));
    return ok({ comments: list });
  }
  const reveal = /^\/api\/blog\/comments\/(\d+)\/reveal$/.exec(p);
  if (reveal) {
    const f = Object.values(store)
      .flat()
      .find((x) => x.id === Number(reveal[1]) && x.flagged);
    return f ? ok({ body: f.text }) : ok({ error: "not_found" }, 404);
  }

  if (!user) return ok({ error: "login" }, 401);

  if (p === "/api/stamps" && method === "POST") {
    for (const c of Array.isArray(body?.codes) ? body.codes : []) if (typeof c === "string") owned.add(c);
    return ok({ ok: true });
  }
  if (banned)
    return ok(
      { error: "banned", ban: { scope: "blog", reason: "Реклама в комментариях", until: null } },
      403,
    );

  if (p === "/api/blog/comments" && method === "POST") {
    const text = cleanText(body?.body, COMMENT_MAX + 1);
    if (!text) return ok({ error: "invalid" }, 400);
    if (text.length > COMMENT_MAX) return ok({ error: "too_long" }, 413);
    if (Date.now() - last < 3000) return ok({ error: "slow" }, 429);
    const list = (store[body.post] ??= []);
    if (list.some((x) => x.user?.id === user!.id && x.text === text)) return ok({ error: "duplicate" }, 409);
    if (
      body.post === GUESTBOOK &&
      !body.parent &&
      list.filter((x) => x.user?.id === user!.id && !x.parent).length >= GUESTBOOK_MAX
    )
      return ok({ error: "guestbook" }, 409);
    last = Date.now();
    const parent = body.parent ? (list.find((x) => x.id === body.parent)?.parent ?? body.parent) : null;
    const card =
      body.card && typeof body.card.icon === "string" && !parent ? { icon: body.card.icon, c: "RU" } : null;
    c(body.post, ++nextId, user, text, 0, { parent, to: body.parent ?? null, own: true, card });
    const made = list[list.length - 1];
    const { post: _p, text: _t, ...rest } = made;
    return ok({ comment: rest, status: made.flagged ? "flagged" : "visible" }, 201);
  }
  const one2 = /^\/api\/blog\/comments\/(\d+)$/.exec(p);
  if (one2) {
    const f = Object.values(store)
      .flat()
      .find((x) => x.id === Number(one2[1]));
    if (!f || f.user?.id !== user.id) return ok({ error: "not_found" }, 404);
    if (method === "DELETE") {
      closeThread(f.id, true);
      return ok({ ok: true });
    }
    const text = cleanText(body?.body, COMMENT_MAX);
    const v = scoreComment(text);
    Object.assign(f, { text, body: isSpam(v) ? "" : text, flagged: isSpam(v), edited: Date.now() });
    return ok({ ok: true, status: f.flagged ? "flagged" : "visible", body: f.body });
  }

  if (p === "/api/blog/mod") {
    if (!user.owner) return ok({ error: "forbidden" }, 403);
    const all = Object.values(store).flat();
    if (body.action === "comment") {
      const f = all.find((x) => x.id === body.comment);
      if (f && body.to === "visible") Object.assign(f, { flagged: false, body: f.text });
      else if (f) closeThread(f.id, true);
    }
    if (body.action === "pin") {
      const f = all.find((x) => x.id === body.comment && !x.parent);
      if (!f) return ok({ error: "not_found" }, 404);
      if (body.pin && all.filter((x) => x.post === f.post && x.pinned).length >= 3)
        return ok({ error: "pin_limit" }, 409);
      f.pinned = !!body.pin;
    }
    if (body.action === "ban" && body.purge)
      all
        .filter((x) => x.user?.id === body.user)
        .forEach((x) => Object.assign(x, { deleted: true, body: "", user: null }));
    return ok({ ok: true });
  }
  if (p === "/api/blog/compose") {
    if (!user.owner) return ok({ error: "forbidden" }, 403);
    if (method === "GET") {
      const f = posts.find((x) => x.id === Number(q.get("id")));
      return f ? ok({ post: { ...f, comments_open: f.commentsOpen } }) : ok({ error: "not_found" }, 404);
    }
    if (body.action === "delete") {
      posts.splice(0, posts.length, ...posts.filter((x) => x.id !== body.id));
      return ok({ ok: true });
    }
    if (body.action === "pin") {
      const f = posts.find((x) => x.id === body.id);
      if (body.on && posts.filter((x) => x.pinned && x !== f).length >= 3)
        return ok({ error: "Закрепить можно не больше 3 постов." }, 409);
      if (f) f.pinned = !!body.on;
      return ok({ ok: true });
    }
    const title = cleanText(body.title, 120);
    if (!title) return ok({ error: "Нужен заголовок" }, 400);
    const fields = {
      title,
      body: cleanText(body.body, 30000),
      excerpt: excerptOf(cleanText(body.body, 30000)),
      tags: body.tags ?? [],
      cover: body.cover ?? "",
      pinned: !!body.pinned,
      commentsOpen: body.commentsOpen !== false,
    };
    const f = posts.find((x) => x.id === body.id);
    if (f) Object.assign(f, fields);
    else if (body.status === "published")
      posts.unshift({
        id: Math.max(0, ...posts.map((x) => x.id)) + 1,
        pub: Date.now(),
        views: 0,
        comments: 0,
        reactions: {},
        mine: [],
        ...fields,
      });
    return ok({ ok: true }, f ? 200 : 201);
  }

  if (p === "/api/blog/react" && method === "GET") {
    if (!user.owner) return ok({ error: "forbidden" }, 403);
    return ok({ people: likers[Number(q.get("post"))] ?? [] });
  }
  if (p === "/api/blog/react") {
    const target =
      body.kind === "post"
        ? posts.find((x) => x.id === body.target)
        : Object.values(store)
            .flat()
            .find((x) => x.id === body.target);
    if (!target || !EMOJI.includes(body.emoji)) return ok({ error: "invalid" }, 400);
    const has = target.mine.includes(body.emoji);
    if (!has && target.mine.length >= MAX_REACTIONS_PER_TARGET) return ok({ error: "max_reactions" }, 409);
    target.mine = has ? target.mine.filter((e) => e !== body.emoji) : [...target.mine, body.emoji];
    if (body.kind !== "post" && user.owner) (target as Cmt).byOwner = [...target.mine];
    if (body.kind === "post") {
      const rest = (likers[body.target] ??= []).filter(
        (x) => !(x.user.id === user!.id && x.emoji === body.emoji),
      );
      likers[body.target] = has ? rest : [{ user, emoji: body.emoji, created: Date.now() }, ...rest];
    }
    const n = (target.reactions[body.emoji] ?? 0) + (has ? -1 : 1);
    if (n > 0) target.reactions[body.emoji] = n;
    else delete target.reactions[body.emoji];
    return ok({ reactions: { ...target.reactions }, mine: [...target.mine] });
  }
  if (p === "/api/blog/report") return ok({ ok: true });
  return ok({ error: "not_found" }, 404);
}
