CREATE TABLE logs (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN (
    'http_success',
    'application_error',
    'ai_error',
    'lead_audit',
    'security_audit'
  )),
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  event TEXT NOT NULL,
  message TEXT NOT NULL,
  request_id TEXT,
  user_id UUID,
  session_id UUID,
  lead_id UUID,
  actor TEXT,
  method TEXT,
  path TEXT,
  status_code INTEGER,
  duration_ms INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX logs_type_created_at_idx ON logs (type, created_at DESC);
CREATE INDEX logs_request_id_idx ON logs (request_id) WHERE request_id IS NOT NULL;
CREATE INDEX logs_user_id_idx ON logs (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX logs_session_id_idx ON logs (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX logs_lead_id_idx ON logs (lead_id) WHERE lead_id IS NOT NULL;
