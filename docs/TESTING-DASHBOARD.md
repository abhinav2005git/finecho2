# Testing the Advisor Dashboard with the Backend

## 1. Environment variables

**Backend** (`backend/.env`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
# Optional, for server-side reads (recommended):
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Frontend** (`frontend/.env`):
```env
VITE_BACKEND_URL=http://localhost:4000
```

## 2. Start the backend

```bash
cd backend
npm run dev
```

You should see: `Backend running on http://localhost:4000`

## 3. Start the frontend

In a **second terminal**:

```bash
cd frontend
npm run dev
```

Open the URL Vite prints (e.g. `http://localhost:5173`).

## 4. Quick API checks (optional)

With the backend running, in a third terminal:

```bash
# Health
curl -s http://localhost:4000/

# Dashboard stats (date range optional)
curl -s "http://localhost:4000/api/advisor/dashboard?from=2025-01-01&to=2026-12-31"

# Calls list
curl -s "http://localhost:4000/api/advisor/calls?from=2025-01-01&to=2026-12-31"
```

You should get JSON. If the `summaries` table is empty, dashboard stats will be zeros and calls will be `[]`.

## 5. Add test data (if Supabase is empty)

Insert a row into the `summaries` table (e.g. via Supabase Dashboard → Table Editor), or call your existing summary API:

```bash
curl -s -X POST http://localhost:4000/api/summary \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "test-call-1",
    "summary": "Client discussed retirement planning.",
    "goals": ["Retirement"],
    "riskLevel": "moderate",
    "sip": { "type": "new", "amount": 10000, "category": "equity", "riskExplained": true },
    "clientResponse": "deferred",
    "compliance": "clear"
  }'
```

Then refresh the dashboard and **Calls** page; you should see the new summary.

## 6. What to verify in the UI

- **Dashboard** (`/dashboard`): Stat cards show numbers (or 0), date range works, no “Failed to fetch” error.
- **Calls** (`/calls`): Table shows rows (or “No calls found”), filters and date range work.
- **Call summary** (`/calls/test-call-1`): After adding the test summary, opening this URL shows the summary detail (or “Processing in Progress” if not found).

If you see loading skeletons then real data (or zeros), the frontend is talking to the backend correctly.
