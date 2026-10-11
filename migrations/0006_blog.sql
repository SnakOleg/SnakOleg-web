-- Mini blog: Telegram users, posts, comments, reactions, reports, bans and settings.
CREATE TABLE users (
  id TEXT PRIMARY KEY,            -- Telegram id
  name TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  picture TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL,
  seen INTEGER NOT NULL,
  comments INTEGER NOT NULL DEFAULT 0,
  trusted INTEGER NOT NULL DEFAULT 0   -- trusted users skip premoderation
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  cover TEXT NOT NULL DEFAULT '',
  pinned INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',        -- draft | published
  comments_open INTEGER NOT NULL DEFAULT 1,
  pub INTEGER NOT NULL,                        -- publication time (may be in the future = scheduled)
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  views INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX posts_pub ON posts (status, pub);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  parent_id INTEGER,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible',      -- visible | flagged | pending | hidden | deleted
  flags TEXT NOT NULL DEFAULT '[]',
  reports INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL,
  edited INTEGER
);
CREATE INDEX comments_post ON comments (post_id, status, created);
CREATE INDEX comments_user ON comments (user_id, created);
CREATE INDEX comments_queue ON comments (status, created);

CREATE TABLE reactions (
  kind TEXT NOT NULL,                          -- post | comment
  target INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (kind, target, user_id, emoji)
) WITHOUT ROWID;
CREATE INDEX reactions_target ON reactions (kind, target);

CREATE TABLE reports (
  comment_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL,
  PRIMARY KEY (comment_id, user_id)
) WITHOUT ROWID;

CREATE TABLE bans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  scope TEXT NOT NULL,                         -- blog | themes | all
  reason TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL,
  until INTEGER,                               -- NULL = permanent
  lifted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX bans_user ON bans (user_id, lifted);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
) WITHOUT ROWID;

CREATE TABLE viewed (
  day TEXT NOT NULL,
  vid TEXT NOT NULL,
  post_id INTEGER NOT NULL,
  PRIMARY KEY (day, vid, post_id)
) WITHOUT ROWID;

ALTER TABLE presets ADD COLUMN user_id TEXT;
