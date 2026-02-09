# Quick Start: Authentication Setup

## Step 1: Install Frontend Dependencies

```bash
cd frontend
npm install @supabase/supabase-js
```

## Step 2: Run Database Migration

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `backend/migrations/002_profiles_auth.sql`
3. Run the migration

## Step 3: Verify Environment Variables

**Frontend** (`frontend/.env`):
```env
VITE_SUPABASE_URL=https://hqnuzpeluqpvnxuwmkuc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Backend** (`backend/.env`):
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Step 4: Create First User

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Enter email and password
4. Set User Metadata:
   ```json
   {
     "name": "Admin User",
     "role": "admin"
   }
   ```
5. Click "Create User"

## Step 5: Restart Servers

```bash
# Frontend
cd frontend
npm run dev

# Backend (in another terminal)
cd backend
npm run dev
```

## Step 6: Test Login

1. Go to `http://localhost:5173/login`
2. Enter the email/password you created
3. Should redirect to dashboard

---

## Troubleshooting

**"Missing Supabase environment variables"**
→ Check `frontend/.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**"Invalid or expired token"**
→ Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in `backend/.env`

**"User profile not found"**
→ Run the migration SQL to create profiles table and trigger

**Login works but API calls fail**
→ Check browser console for CORS errors, verify backend is running
