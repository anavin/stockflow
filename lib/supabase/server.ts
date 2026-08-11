/** Supabase server client (service role). Never import from a client component.
 * The app queries via raw SQL (lib/db.ts); this is here for future storage/auth. */
import { createClient } from "@supabase/supabase-js";
import { APP_KEY } from "@/lib/config";

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, db: { schema: APP_KEY } });
}
