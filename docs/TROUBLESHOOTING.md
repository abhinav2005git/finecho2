# Troubleshooting: ERR_CONNECTION_REFUSED

## Quick Fixes

### 1. **Backend Server Not Running**

**Check:**
```bash
# In backend directory
cd backend
npm run dev
```

You should see: `Backend running on http://localhost:4000`

**If you see errors:**
- Make sure you ran `npm install` in the backend directory
- Check that `backend/.env` has `SUPABASE_URL` and `SUPABASE_ANON_KEY` set

---

### 2. **Frontend Not Picking Up Environment Variables**

**Vite requires a restart after changing `.env` files:**

1. Stop the frontend dev server (Ctrl+C)
2. Restart it:
   ```bash
   cd frontend
   npm run dev
   ```

**Verify the env variable is loaded:**
- Open browser console (F12)
- You should see: `VITE_BACKEND_URL not set, using default: http://localhost:4000` (if not set)
- Or check Network tab - API calls should go to `http://localhost:4000/api/...`

---

### 3. **Check Backend is Accessible**

**Test in browser or terminal:**
```bash
curl http://localhost:4000/
```

Should return: `FinEcho backend running`

**If this fails:**
- Backend is not running or port 4000 is blocked
- Check if another process is using port 4000: `lsof -i :4000` (Mac/Linux)

---

### 4. **CORS Issues**

If you see CORS errors in the browser console:
- Backend already has `app.use(cors())` - this should work
- If still failing, check backend `server.js` has `cors()` middleware before routes

---

### 5. **Environment Variables**

**Backend** (`backend/.env`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
# Optional:
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Frontend** (`frontend/.env`):
```env
VITE_BACKEND_URL=http://localhost:4000
```

**Important:** 
- Frontend `.env` must start with `VITE_` for Vite to expose it
- Restart frontend dev server after changing `.env`

---

### 6. **Database Connection Issues**

If backend is running but you get database errors:

**Check Supabase:**
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `backend/.env` are correct
- Test Supabase connection:
  ```bash
  cd backend
  node -e "import('./supabase.js').then(m => console.log('Supabase loaded:', !!m.default))"
  ```

**If tables don't exist:**
- Run `backend/migrations/001_calls_clients.sql` in Supabase SQL Editor
- Or the backend will fall back to `summaries` table if `calls` table doesn't exist

---

## Step-by-Step Startup

1. **Terminal 1 - Backend:**
   ```bash
   cd backend
   npm install  # if not done already
   npm run dev
   ```
   Wait for: `Backend running on http://localhost:4000`

2. **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm install  # if not done already
   npm run dev
   ```
   Open the URL Vite shows (e.g. `http://localhost:5173`)

3. **Verify:**
   - Open browser DevTools → Network tab
   - Navigate to Dashboard
   - Check API calls go to `http://localhost:4000/api/...`
   - If you see `ERR_CONNECTION_REFUSED`, backend is not running

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ERR_CONNECTION_REFUSED` | Backend not running | Start backend: `cd backend && npm run dev` |
| `Failed to fetch` | CORS or network | Check backend is running, check `.env` |
| `VITE_BACKEND_URL is undefined` | Env not loaded | Restart frontend dev server |
| `relation "calls" does not exist` | Tables not created | Run migration SQL in Supabase |
| `Cannot find module 'multer'` | Dependencies missing | Run `npm install` in backend |

---

## Still Not Working?

1. **Check both servers are running:**
   - Backend: `http://localhost:4000` responds
   - Frontend: Vite dev server is running

2. **Check browser console:**
   - Look for specific error messages
   - Check Network tab for failed requests

3. **Verify ports:**
   - Backend: 4000
   - Frontend: Usually 5173 (Vite default)

4. **Test backend directly:**
   ```bash
   curl http://localhost:4000/api/advisor/dashboard?from=2025-01-01&to=2026-12-31
   ```
   Should return JSON (even if empty data)
