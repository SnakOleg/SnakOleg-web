CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  tg_id TEXT NOT NULL,
  name TEXT,
  created INTEGER NOT NULL,
  seen INTEGER NOT NULL,
  ip TEXT,
  last_ip TEXT,
  country TEXT,
  last_country TEXT,
  city TEXT,
  org TEXT,
  ua TEXT,
  fp TEXT,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX sessions_created ON sessions (created);

CREATE TABLE blocked (
  ip TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  reason TEXT
);

ALTER TABLE audit ADD COLUMN ip TEXT;
ALTER TABLE audit ADD COLUMN ua TEXT;
ALTER TABLE audit ADD COLUMN country TEXT;
ALTER TABLE audit ADD COLUMN city TEXT;

DROP TABLE settings;
