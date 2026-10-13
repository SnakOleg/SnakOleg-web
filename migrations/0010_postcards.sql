-- A guestbook comment can be a postcard: {"icon":"sun","c":"DE"}.
ALTER TABLE comments ADD COLUMN card TEXT;
