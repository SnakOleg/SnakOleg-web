-- Content overrides edited from the admin (one row per section) + version history
CREATE TABLE content (key TEXT PRIMARY KEY, value TEXT NOT NULL, version INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE content_history (key TEXT NOT NULL, version INTEGER NOT NULL, value TEXT NOT NULL, ts INTEGER NOT NULL, actor TEXT, PRIMARY KEY (key, version)) WITHOUT ROWID;
-- Privacy-friendly analytics: daily counters only (no IPs, no cookies). WITHOUT ROWID = 1 row written per upsert
CREATE TABLE agg (day TEXT NOT NULL, metric TEXT NOT NULL, key TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, metric, key)) WITHOUT ROWID;
CREATE TABLE seen (day TEXT NOT NULL, vid TEXT NOT NULL, PRIMARY KEY (day, vid)) WITHOUT ROWID;
CREATE TABLE audit (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, actor TEXT, action TEXT NOT NULL, detail TEXT);
CREATE TABLE rate (key TEXT PRIMARY KEY, w INTEGER NOT NULL, n INTEGER NOT NULL);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO settings (key, value) VALUES ('session_version', '1');
