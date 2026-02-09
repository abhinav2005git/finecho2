# Database Setup: Creating the Calls and Clients Tables

## Error: "Could not find the table 'public.calls' in the schema cache"

This error means the `calls` and `clients` tables don't exist in your Supabase database yet.

---

## Quick Fix: Run the Migration

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Copy and Run the Migration

Copy the entire contents of `backend/migrations/001_calls_clients.sql` and paste it into the SQL Editor, then click **Run** (or press Cmd/Ctrl + Enter).

**Or copy this:**

```sql
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
```

### Step 3: (Optional) Add a Test Client

To test the "Add Call" feature, add at least one client:

```sql
INSERT INTO clients (advisor_id, name, email) 
VALUES ('advisor-1', 'Test Client', 'client@example.com');
```

---

## Verify Tables Were Created

After running the migration:

1. In Supabase dashboard, go to **Table Editor**
2. You should see two new tables:
   - `clients`
   - `calls`

---

## What This Creates

### `clients` Table
- Stores advisor's clients
- Used for the "Add Call" dropdown
- Fields: `id`, `advisor_id`, `name`, `email`, `phone`, `created_at`

### `calls` Table
- Stores call recordings and their processing results
- Linked to `clients` via `client_id` foreign key
- Fields include: `transcript`, `summary`, `goals`, `language`, `compliance_status`, `compliance_flags`, etc.

---

## After Migration

1. **Refresh your frontend** - the Calls page should now work
2. **Add a client** (via SQL or future API) so "Add Call" has clients to select
3. **Upload a call** - the full pipeline will work

---

## Troubleshooting

**If you get "relation already exists":**
- Tables already exist, you're good to go!

**If you get permission errors:**
- Make sure you're using the SQL Editor (has full permissions)
- Check you're in the correct project

**If migration runs but tables don't appear:**
- Refresh the Table Editor page
- Check you're looking at the correct schema (should be `public`)

---

## Alternative: Use Existing `summaries` Table

If you don't want to create the new tables yet, the backend will:
- Return empty arrays for `/api/calls` and `/api/clients`
- Dashboard will fall back to using the `summaries` table (if it exists)

But to use the full call upload/processing pipeline, you need the `calls` and `clients` tables.
