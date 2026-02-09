-- Run this in Supabase SQL Editor if you don't have these tables yet.
-- Clients: advisors' clients for the "Add Call" dropdown
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Calls: full lifecycle from upload to completed
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  audio_path TEXT,
  transcript TEXT,
  summary TEXT,
  goals JSONB DEFAULT '[]',
  language TEXT,
  duration_seconds INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'transcribing', 'transcribed', 'summarized', 'completed')),
  compliance_status TEXT DEFAULT 'clear' CHECK (compliance_status IN ('clear', 'warning', 'risk')),
  compliance_flags JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calls_advisor_created ON calls(advisor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_client ON calls(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_advisor ON clients(advisor_id);

-- Optional: insert a test client for advisor-1 (matches mock auth) so "Add Call" has a client to select.
-- INSERT INTO clients (advisor_id, name, email) VALUES ('advisor-1', 'Test Client', 'client@example.com');
