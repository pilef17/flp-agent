import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Zeitlich begrenzte Links für private Medien. Die Storage-Policies prüfen mit
 * dem Token des Benutzers, ob er die Datei sehen darf – ohne Recht kein Link.
 */
export async function signedUrls(
  supabase: SupabaseClient,
  bucket: "exercise-media" | "program-media" | "player-media",
  paths: string[],
  expiresIn = 60 * 60,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresIn);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const d of data) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}
