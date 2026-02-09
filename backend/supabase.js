import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Default client (anon key). Use for inserts when RLS allows. */
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Server-side admin client for dashboard/advisor reads. Prefer when SERVICE_ROLE_KEY is set. */
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } })
  : supabase;

export default supabase;
