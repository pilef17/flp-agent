// Zentrale, geprüfte Umgebungsvariablen. Geheimnisse nie im Client verwenden.
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Umgebungsvariable ${name} fehlt. Siehe .env.example.`);
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: () =>
    required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  siteUrl: () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
};

export const serverEnv = {
  supabaseSecretKey: () =>
    required(
      "SUPABASE_SECRET_KEY",
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
};

export const stripeEnv = {
  secretKey: () => required("STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY),
  webhookSecret: () => required("STRIPE_WEBHOOK_SECRET", process.env.STRIPE_WEBHOOK_SECRET),
  /** Nur für lokale Tests mit stripe-mock, z.B. http://localhost:12111 */
  apiBase: () => process.env.STRIPE_API_BASE || null,
};
