-- Passport stamps: easter eggs, countries, seasons and actions.
CREATE TABLE stamps (
  user_id TEXT NOT NULL,
  code TEXT NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (user_id, code)
) WITHOUT ROWID;
