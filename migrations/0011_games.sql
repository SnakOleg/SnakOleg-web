CREATE TABLE games (
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  day INTEGER NOT NULL,
  score INTEGER NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (user_id, kind, day)
);
CREATE INDEX games_kind_score ON games(kind, score);
