import { createBrowserClient } from "@supabase/ssr";

/** Browser-Client – nur für Auth-Flows, die das URL-Fragment lesen müssen. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
  );
}
