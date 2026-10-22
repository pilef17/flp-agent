import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { initialAndCurrent, type AssessmentRow, type CategoryRow } from "@/lib/assessments";
import { weekStart } from "@/lib/format";

export type SessionView = {
  id: string;
  title: string;
  scheduledOn: string;
  completed: boolean;
  exercises: { id: string; title: string; code: string; completed: boolean }[];
};

/**
 * Lädt die für Eltern/Spieler sichtbare Übersicht eines Spielers.
 * Nur veröffentlichte Inhalte; RLS stellt zusätzlich die Zugriffsrechte sicher.
 */
export async function loadPlayerOverview(supabase: SupabaseClient, playerId: string) {
  const [categoriesRes, assessmentsRes, feedbackRes, plansRes] = await Promise.all([
    supabase.from("assessment_categories").select("id, name, position").order("position"),
    supabase
      .from("assessments")
      .select("id, kind, assessed_on, status, assessment_scores(category_id, score)")
      .eq("player_id", playerId)
      .eq("status", "published")
      .order("assessed_on"),
    supabase
      .from("coach_feedback")
      .select("id, title, body, published_at")
      .eq("player_id", playerId)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3),
    supabase
      .from("training_plans")
      .select(
        "id, title, week_start, training_sessions(id, title, scheduled_on, session_exercises(id, position, exercises(code, title)), session_completions(id, session_exercise_id))",
      )
      .eq("player_id", playerId)
      .eq("status", "published")
      .eq("week_start", weekStart())
      .limit(1),
  ]);

  const error = categoriesRes.error ?? assessmentsRes.error ?? feedbackRes.error ?? plansRes.error;
  if (error) throw new Error(`Spielerdaten konnten nicht geladen werden: ${error.message}`);

  const categories = (categoriesRes.data ?? []) as CategoryRow[];
  const assessments = (assessmentsRes.data ?? []) as AssessmentRow[];
  const { initial, current } = initialAndCurrent(categories, assessments);

  type RawSession = {
    id: string;
    title: string;
    scheduled_on: string;
    session_exercises: { id: string; position: number; exercises: { code: string; title: string } | null }[];
    session_completions: { id: string; session_exercise_id: string | null }[];
  };
  const plan = (plansRes.data?.[0] ?? null) as { id: string; title: string; training_sessions: RawSession[] } | null;
  const sessions: SessionView[] = (plan?.training_sessions ?? [])
    .sort((a, b) => a.scheduled_on.localeCompare(b.scheduled_on))
    .map((s) => ({
      id: s.id,
      title: s.title,
      scheduledOn: s.scheduled_on,
      completed: s.session_completions.some((c) => c.session_exercise_id === null),
      exercises: [...s.session_exercises]
        .sort((a, b) => a.position - b.position)
        .map((se) => ({
          id: se.id,
          title: se.exercises?.title ?? "Übung",
          code: se.exercises?.code ?? "",
          completed: s.session_completions.some((c) => c.session_exercise_id === se.id),
        })),
    }));

  return {
    categories: categories.map((c) => c.name),
    initial,
    current,
    assessmentCount: assessments.length,
    feedback: feedbackRes.data ?? [],
    plan: plan ? { id: plan.id, title: plan.title } : null,
    sessions,
  };
}
