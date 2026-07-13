CREATE TABLE leads (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  contact VARCHAR(500) NOT NULL,
  task TEXT NOT NULL DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'New'
    CHECK (status IN ('New', 'In Progress', 'Completed', 'Rejected')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX leads_status_idx ON leads (status);
