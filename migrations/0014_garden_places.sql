ALTER TABLE garden ADD COLUMN loc TEXT NOT NULL DEFAULT 'meadow';
ALTER TABLE garden ADD COLUMN color INTEGER NOT NULL DEFAULT 0;
ALTER TABLE garden ADD COLUMN deco TEXT NOT NULL DEFAULT '';
CREATE INDEX garden_loc ON garden(loc, stage);
CREATE TABLE garden_gifts (
  day INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  target TEXT NOT NULL,
  PRIMARY KEY (day, user_id, target)
);
