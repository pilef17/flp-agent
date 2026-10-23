import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Service-Client – umgeht RLS. Nur serverseitig und nur nach expliziter
 * Berechtigungsprüfung verwenden (Einladungen, Webhooks).
 */
export function createAdminClient() {
  return createClient(publicEnv.supabaseUrl(), serverEnv.supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
