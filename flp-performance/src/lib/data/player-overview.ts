import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { initialAndCurrent, type AssessmentRow, type CategoryRow } from "@/lib/assessments";
import { mondayOf, todayInSwitzerland } from "@/lib/dates";
import { loadWeekPlan } from "./week-plan";

/**
 * Lädt die für Eltern/Spieler sichtbare Übersicht eines Spielers.
 * Nur veröffentlichte Inhalte; RLS stellt zusätzlich die Zugriffsrechte sicher.
 */
export async function loadPlayerOverview(supabase: SupabaseClient, playerId: string) {
  const [categoriesRes, assessmentsRes, feedbackRes, week] = await Promise.all([
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
    loadWeekPlan(supabase, playerId, mondayOf(todayInSwitzerland())),
  ]);

  const error = categoriesRes.error ?? assessmentsRes.error ?? feedbackRes.error;
  if (error) throw new Error(`Spielerdaten konnten nicht geladen werden: ${error.message}`);

  const categories = (categoriesRes.data ?? []) as CategoryRow[];
  const assessments = (assessmentsRes.data ?? []) as AssessmentRow[];
  const { initial, current } = initialAndCurrent(categories, assessments);

  return {
    categories: categories.map((c) => c.name),
    initial,
    current,
    assessmentCount: assessments.length,
    feedback: feedbackRes.data ?? [],
    plan: week.plan,
    sessions: week.sessions,
  };
}
