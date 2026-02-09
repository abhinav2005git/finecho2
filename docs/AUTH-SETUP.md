# Authentication & Authorization Setup Guide

## Overview

FinEcho now uses **Supabase Auth** for complete authentication and authorization with role-based access control (RBAC).

---

## 1. Database Setup

### Step 1: Run Migration

Run the profiles table migration in Supabase SQL Editor:

**File:** `backend/migrations/002_profiles_auth.sql`

This creates:
- `profiles` table linked to `auth.users`
- RLS policies for security
- Auto-profile creation trigger on signup
- Role-based access (advisor/admin)

---

## 2. Environment Variables

### Frontend (`frontend/.env`)

```env
VITE_BACKEND_URL=http://localhost:4000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (`backend/.env`)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Required for JWT verification
```

**Important:** 
- `SUPABASE_SERVICE_ROLE_KEY` is required for backend JWT verification
- Never expose service role key in frontend

---

## 3. Create First User

### Option A: Via Supabase Dashboard

1. Go to **Authentication** → **Users** → **Add User**
2. Enter email and password
3. Set **User Metadata**:
   ```json
   {
     "name": "Admin User",
     "role": "admin"
   }
   ```
4. Click **Create User**

### Option B: Via SQL (for testing)

```sql
-- Create user in auth.users (you'll need to set password via dashboard or API)
-- Then update profile:
UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
```

### Option C: Sign Up Flow (if you add signup page)

Users can sign up, and the trigger will auto-create a profile with `role = 'advisor'` by default.

---

## 4. How It Works

### Frontend Flow

1. **Login:** User enters email/password → Supabase Auth validates → Session stored
2. **API Calls:** All API calls include `Authorization: Bearer <token>` header
3. **Session:** Persists across page refreshes (handled by Supabase)

### Backend Flow

1. **Middleware:** `verifyAuth` extracts JWT from `Authorization` header
2. **Verification:** Supabase verifies token and returns user
3. **Profile Lookup:** Fetches user profile (role) from `profiles` table
4. **Role Check:** `requireAdvisor` or `requireAdmin` enforces access
5. **Request:** `req.user` contains `{ id, email, name, role }`

---

## 5. Protected Routes

### Backend Routes (All Protected)

- ✅ `/api/calls/*` - Requires advisor or admin
- ✅ `/api/clients/*` - Requires advisor or admin
- ✅ `/api/advisor/*` - Requires advisor or admin
- ✅ `/api/dashboard/*` - Requires advisor or admin
- ✅ `/api/summary` - Requires advisor or admin
- ✅ `/api/summaries` - Requires advisor or admin

**Public Routes:**
- ✅ `GET /` - Health check (no auth)

### Frontend Routes

- ✅ `/dashboard` - Protected (redirects to `/login` if not authenticated)
- ✅ `/calls` - Protected
- ✅ `/calls/:id` - Protected
- ✅ `/login` - Public (redirects to `/dashboard` if authenticated)

---

## 6. Role-Based Access

### Roles

- **`advisor`**: Can access dashboard, calls, upload recordings
- **`admin`**: Can access everything (future: admin routes, analytics)

### Current Implementation

- All routes use `requireAdvisor` (allows both advisor and admin)
- Future admin-only routes will use `requireAdmin`

---

## 7. Testing

### Test Login

1. Create a user in Supabase Auth
2. Go to `/login`
3. Enter email/password
4. Should redirect to `/dashboard`

### Test API Protection

```bash
# Without token (should fail)
curl http://localhost:4000/api/calls

# With token (should work)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/calls
```

### Test Role Enforcement

- Try accessing admin routes as advisor (should fail if implemented)
- All current routes allow both advisor and admin

---

## 8. Troubleshooting

### "Missing or invalid authorization header"

- Frontend not sending token → Check `authFetch` in `lib/api.ts`
- Token expired → Supabase auto-refreshes, but check session

### "User profile not found"

- Profile not created → Run migration, or trigger will create on next login
- User exists in auth but not profiles → Check trigger function

### "Access denied. Required role: admin"

- User has wrong role → Update in `profiles` table:
  ```sql
  UPDATE profiles SET role = 'admin' WHERE email = 'user@example.com';
  ```

### Frontend: "Missing Supabase environment variables"

- Check `frontend/.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart frontend dev server after changing `.env`

---

## 9. Security Notes

✅ **What's Secure:**
- JWT verification on every request
- Role checks enforced server-side
- No hardcoded users or passwords
- RLS policies on profiles table
- Service role key only on backend

⚠️ **Future Enhancements:**
- Add admin-only routes (analytics, user management)
- Add rate limiting
- Add request logging/audit trail
- Add password reset flow
- Add email verification

---

## 10. Migration from Mock Auth

If you had mock auth before:
1. ✅ AuthContext now uses Supabase
2. ✅ All API calls include auth token
3. ✅ Backend verifies every request
4. ✅ No more `advisor-1` hardcoded IDs

**Action Required:**
- Create real users in Supabase Auth
- Update any existing data to use real user IDs (not `advisor-1`)

---

## Quick Start Checklist

- [ ] Run `002_profiles_auth.sql` migration
- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `frontend/.env`
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to `backend/.env`
- [ ] Create first user in Supabase Auth
- [ ] Restart frontend dev server
- [ ] Test login flow
- [ ] Verify API calls work with auth

---

## Files Changed

**Backend:**
- `middleware/auth.js` - JWT verification & role checks
- `server.js` - Protected all routes
- `routes/calls.js` - Uses `req.user.id` instead of query param
- `routes/clients.js` - Uses `req.user.id` instead of query param

**Frontend:**
- `lib/supabase.ts` - Supabase client
- `lib/api.ts` - Authenticated fetch helper
- `contexts/AuthContext.tsx` - Supabase Auth integration
- `pages/Login.tsx` - Real Supabase login
- `api/*.ts` - All use `authFetch` with tokens
- `pages/Dashboard.tsx` - Removed advisor_id params
- `pages/CallsList.tsx` - Removed advisor_id params
