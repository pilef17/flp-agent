import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_KEYS, type Category } from "@/lib/exercises";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Card, CardTitle } from "@/components/ui/Card";
import { ExerciseCard, CategoryFilter, type ExerciseListItem } from "@/components/exercises/ExerciseCard";
import { ExerciseForm } from "./ExerciseForm";
import { createExercise } from "./actions";

export const metadata: Metadata = { title: "Übungen verwalten" };

export default async function AdminExercises({ searchParams }: { searchParams: Promise<{ kategorie?: string; q?: string }> }) {
  await requireStaff();
  const { kategorie, q = "" } = await searchParams;
  const category = CATEGORY_KEYS.includes(kategorie as Category) ? (kategorie as Category) : undefined;
  const term = q.trim().slice(0, 60).replace(/[%_,()]/g, "");
  const supabase = await createClient();

  let query = supabase
    .from("exercises")
    .select("id, code, title, category, age_min, age_max, difficulty, description, status, exercise_media(id)")
    .order("code")
    .limit(500);
  if (category) query = query.eq("category", category);
  if (term) query = query.or(`title.ilike.%${term}%,code.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const exercises = (data ?? []) as ExerciseListItem[];

  return (
    <>
      <PageHeader eyebrow="Verwaltung" title="Übungen" text="Übungen erstellen, Videos hochladen und für Spieler freigeben." />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <form role="search" className="mb-4">
            {category && <input type="hidden" name="kategorie" value={category} />}
            <label htmlFor="q" className="sr-only">
              Übung suchen
            </label>
            <input id="q" name="q" defaultValue={term} placeholder="Titel oder ID suchen …" className="field" />
          </form>
          <CategoryFilter basePath="/admin/uebungen" active={category} q={term} />
          <div className="mt-5">
            {exercises.length === 0 ? (
              <EmptyState title={term || category ? "Keine Treffer" : "Noch keine Übungen"} text="Erstelle die erste Übung im Formular «Übung erstellen»." />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {exercises.map((e) => (
                  <li key={e.id}>
                    <ExerciseCard exercise={e} href={`/admin/uebungen/${e.id}`} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Card className="h-fit lg:col-span-2">
          <CardTitle eyebrow="Neu" title="Übung erstellen" />
          <ExerciseForm action={createExercise} submitLabel="Übung erstellen" />
        </Card>
      </div>
    </>
  );
}
