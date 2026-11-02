import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

/**
 * Service-role client. Server only — never import from client components.
 * Use it only to call the booking-engine functions on behalf of guests
 * (create_booking, manage-link actions) and for scheduled jobs.
 */
export function createServiceClient() {
  const e = serverEnv();
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
