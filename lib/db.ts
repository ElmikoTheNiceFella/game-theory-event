import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server client: secret key, bypasses RLS. Never import from client components.
export const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET!, {
  auth: { persistSession: false },
});
