CREATE TABLE users (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE leads
  ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN session_id VARCHAR(128) REFERENCES chat_sessions(id) ON DELETE SET NULL;

CREATE INDEX chat_sessions_user_id_idx ON chat_sessions (user_id);
CREATE INDEX leads_user_id_idx ON leads (user_id);
CREATE INDEX leads_session_id_idx ON leads (session_id);
