import { createClient } from "@supabase/supabase-js";

// Browser client: publishable key, read-only via RLS.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);
