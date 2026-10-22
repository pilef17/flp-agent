import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_KEYS, type Category } from "@/lib/exercises";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { ExerciseCard, CategoryFilter, type ExerciseListItem } from "@/components/exercises/ExerciseCard";

export const metadata: Metadata = { title: "Übungsbibliothek" };

export default async function ExerciseLibrary({ searchParams }: { searchParams: Promise<{ kategorie?: string; q?: string }> }) {
  await requireViewer();
  const { kategorie, q = "" } = await searchParams;
  const category = CATEGORY_KEYS.includes(kategorie as Category) ? (kategorie as Category) : undefined;
  const term = q.trim().slice(0, 60).replace(/[%_,()]/g, "");
  const supabase = await createClient();

  // RLS liefert nur Übungen, auf die der Benutzer Zugriff hat
  let query = supabase
    .from("exercises")
    .select("id, code, title, category, age_min, age_max, difficulty, description, exercise_media(id)")
    .eq("status", "published")
    .order("code")
    .limit(300);
  if (category) query = query.eq("category", category);
  if (term) query = query.ilike("title", `%${term}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const exercises = (data ?? []) as ExerciseListItem[];

  return (
    <>
      <PageHeader eyebrow="Übungsbibliothek" title="Übungen" text="Jede Übung mit Video, Dosierung und Coaching-Hinweisen." />
      <form role="search" className="mb-4">
        {category && <input type="hidden" name="kategorie" value={category} />}
        <label htmlFor="q" className="sr-only">
          Übung suchen
        </label>
        <input id="q" name="q" defaultValue={term} placeholder="Übung suchen …" className="field" />
      </form>
      <CategoryFilter basePath="/uebungen" active={category} q={term} />
      <div className="mt-6">
        {exercises.length === 0 ? (
          <EmptyState
            title={term || category ? "Keine Treffer" : "Noch keine Übungen freigeschaltet"}
            text={
              term || category
                ? "Versuche eine andere Kategorie oder einen anderen Suchbegriff."
                : "Übungen erscheinen hier, sobald der Trainer sie dir in einem Plan zuweist, ein Coaching aktiv ist oder du ein Programm gekauft hast."
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exercises.map((e) => (
              <li key={e.id}>
                <ExerciseCard exercise={e} href={`/uebungen/${e.id}`} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
