CREATE TABLE garden (
  user_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  stage INTEGER NOT NULL DEFAULT 0,
  watered INTEGER NOT NULL DEFAULT 0,
  planted INTEGER NOT NULL
);

CREATE TABLE capsules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created INTEGER NOT NULL,
  opens INTEGER NOT NULL,
  opened INTEGER
);
CREATE INDEX capsules_user ON capsules(user_id);
CREATE INDEX capsules_opens ON capsules(opens);
