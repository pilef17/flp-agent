import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Viewer } from "@/lib/auth";

export type MyPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  birth_year: number;
  position: string | null;
  club: string | null;
};

const COLUMNS = "id, first_name, last_name, birth_year, position, club";

/** Spieler, die der Benutzer als Elternteil oder als Spieler selbst sehen darf. */
export async function loadMyPlayers(supabase: SupabaseClient, viewer: Viewer): Promise<MyPlayer[]> {
  const out: MyPlayer[] = [];
  if (viewer.roles.includes("player")) {
    const { data } = await supabase.from("players").select(COLUMNS).eq("user_id", viewer.id).maybeSingle();
    if (data) out.push(data as MyPlayer);
  }
  if (viewer.roles.includes("parent")) {
    const { data } = await supabase
      .from("guardian_player_links")
      .select(`players(${COLUMNS})`)
      .eq("guardian_id", viewer.id)
      .eq("status", "active");
    for (const row of data ?? []) {
      const p = row.players as unknown as MyPlayer | null;
      if (p && !out.some((x) => x.id === p.id)) out.push(p);
    }
  }
  return out.sort((a, b) => a.first_name.localeCompare(b.first_name, "de-CH"));
}
