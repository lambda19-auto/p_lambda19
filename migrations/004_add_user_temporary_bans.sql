ALTER TABLE users
  ADD COLUMN banned_until TIMESTAMPTZ;

CREATE INDEX users_banned_until_idx
  ON users (banned_until)
  WHERE banned_until IS NOT NULL;
