import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dosage } from "@/lib/exercises";

export type PlanExerciseView = {
  id: string;
  exerciseId: string;
  title: string;
  code: string;
  dosage: string;
  notes: string;
  completed: boolean;
};

export type SessionView = {
  id: string;
  title: string;
  notes: string;
  scheduledOn: string;
  completed: boolean;
  exercises: PlanExerciseView[];
};

type RawSession = {
  id: string;
  title: string;
  notes: string;
  scheduled_on: string;
  session_exercises: {
    id: string;
    exercise_id: string;
    position: number;
    sets: number | null;
    repetitions: number | null;
    duration_seconds: number | null;
    rest_seconds: number | null;
    notes: string;
    exercises: { code: string; title: string } | null;
  }[];
  session_completions: { session_exercise_id: string | null }[];
};

/** Veröffentlichter Wochenplan eines Spielers (RLS prüft die Berechtigung). */
export async function loadWeekPlan(supabase: SupabaseClient, playerId: string, monday: string) {
  const { data, error } = await supabase
    .from("training_plans")
    .select(
      "id, title, notes, week_start, training_sessions(id, title, notes, scheduled_on, session_exercises(id, exercise_id, position, sets, repetitions, duration_seconds, rest_seconds, notes, exercises(code, title)), session_completions(session_exercise_id))",
    )
    .eq("player_id", playerId)
    .eq("status", "published")
    .eq("week_start", monday)
    .maybeSingle();
  if (error) throw new Error(`Trainingsplan konnte nicht geladen werden: ${error.message}`);
  if (!data) return { plan: null, sessions: [] as SessionView[] };

  const sessions = ((data.training_sessions ?? []) as RawSession[])
    .sort((a, b) => a.scheduled_on.localeCompare(b.scheduled_on))
    .map(
      (s): SessionView => ({
        id: s.id,
        title: s.title,
        notes: s.notes,
        scheduledOn: s.scheduled_on,
        completed: s.session_completions.some((c) => c.session_exercise_id === null),
        exercises: [...s.session_exercises]
          .sort((a, b) => a.position - b.position)
          .map((se) => ({
            id: se.id,
            exerciseId: se.exercise_id,
            title: se.exercises?.title ?? "Übung",
            code: se.exercises?.code ?? "",
            dosage: dosage(se),
            notes: se.notes,
            completed: s.session_completions.some((c) => c.session_exercise_id === se.id),
          })),
      }),
    );
  return { plan: { id: data.id as string, title: data.title as string, notes: data.notes as string }, sessions };
}
