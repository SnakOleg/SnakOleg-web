-- Owner can pin a top-level comment (post_id 0 is the guestbook).
ALTER TABLE comments ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
