CREATE TABLE presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  author TEXT NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  palette TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created INTEGER NOT NULL,
  ip_hash TEXT
);

CREATE INDEX presets_status ON presets (status, created);
