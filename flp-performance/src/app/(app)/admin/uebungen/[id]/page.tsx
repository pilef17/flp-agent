import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/data/media";
import { PageHeader, Badge, Alert } from "@/components/ui/Feedback";
import { Card, CardTitle } from "@/components/ui/Card";
import { ExerciseForm } from "../ExerciseForm";
import { VideoUpload } from "../VideoUpload";
import { deleteExerciseVideo, setExerciseStatus, updateExercise } from "../actions";

export const metadata: Metadata = { title: "Übung bearbeiten" };

export default async function AdminExercisePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erstellt?: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const { erstellt } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: ex } = await supabase
    .from("exercises")
    .select("*, exercise_media(id, storage_path, position)")
    .eq("id", id)
    .maybeSingle();
  if (!ex) notFound();

  const media = [...(ex.exercise_media as { id: string; storage_path: string; position: number }[])].sort((a, b) => a.position - b.position);
  const urls = await signedUrls(supabase, "exercise-media", media.map((m) => m.storage_path));
  const published = ex.status === "published";
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/admin/uebungen" className="text-mute hover:text-paper">
          ← Alle Übungen
        </Link>
      </p>
      <PageHeader
        eyebrow={`Übung ${ex.code}`}
        title={ex.title}
        action={
          <form action={setExerciseStatus} className="flex items-center gap-3">
            {published ? <Badge tone="ok">Freigegeben</Badge> : <Badge tone="danger">Entwurf</Badge>}
            <input type="hidden" name="id" value={ex.id} />
            <input type="hidden" name="status" value={published ? "draft" : "published"} />
            <button
              type="submit"
              className={`min-h-11 rounded-card border px-4 text-sm ${published ? "border-line text-mute hover:text-paper" : "border-gold bg-gold font-semibold text-ink hover:bg-gold-soft"}`}
            >
              {published ? "Zurück auf Entwurf" : "Freigeben"}
            </button>
          </form>
        }
      />
      {erstellt && (
        <div className="mb-6">
          <Alert tone="success">Übung als Entwurf erstellt. Lade ein Video hoch und gib die Übung frei.</Alert>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle eyebrow="Inhalt" title="Übung bearbeiten" />
          <ExerciseForm
            action={updateExercise.bind(null, ex.id)}
            submitLabel="Speichern"
            defaults={{
              title: ex.title,
              category: ex.category,
              description: ex.description,
              ageMin: s(ex.age_min),
              ageMax: s(ex.age_max),
              difficulty: s(ex.difficulty),
              sets: s(ex.sets),
              repetitions: s(ex.repetitions),
              durationSeconds: s(ex.duration_seconds),
              restSeconds: s(ex.rest_seconds),
              coachingInstructions: ex.coaching_instructions,
              safetyNotes: ex.safety_notes,
            }}
          />
        </Card>
        <Card className="h-fit lg:col-span-2">
          <CardTitle eyebrow="Medien" title="Videos" />
          <ul className="mb-5 space-y-4">
            {media.map((m) => (
              <li key={m.id} className="space-y-2">
                {urls[m.storage_path] ? (
                  <video src={urls[m.storage_path]} controls preload="metadata" playsInline className="aspect-video w-full rounded-card bg-black" />
                ) : (
                  <p className="text-sm text-danger">Datei nicht gefunden.</p>
                )}
                <form action={deleteExerciseVideo}>
                  <input type="hidden" name="mediaId" value={m.id} />
                  <input type="hidden" name="exerciseId" value={ex.id} />
                  <button type="submit" className="min-h-11 text-sm text-danger hover:underline">
                    Video löschen
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <VideoUpload exerciseId={ex.id} />
          <p className="mt-4 text-xs text-mute">
            Keine Videos zeigen, auf denen Kinder erkennbar sind, ausser mit Einwilligung der Eltern.
          </p>
        </Card>
      </div>
    </>
  );
}
