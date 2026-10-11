-- Replies remember which comment they answer, so a thread can show "in reply to ...".
ALTER TABLE comments ADD COLUMN reply_to INTEGER;
