CREATE TABLE users (
  id UUID PRIMARY KEY,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE leads
  ADD COLUMN user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  ADD COLUMN session_id UUID REFERENCES chat_sessions (id) ON DELETE SET NULL;

CREATE INDEX chat_sessions_user_id_idx ON chat_sessions (user_id);
CREATE INDEX chat_sessions_last_seen_at_idx ON chat_sessions (last_seen_at DESC);
CREATE INDEX leads_user_id_idx ON leads (user_id);
CREATE INDEX leads_session_id_idx ON leads (session_id);
