import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/data/media";
import { PageHeader } from "@/components/ui/Feedback";
import { ExerciseFacts, ExerciseVideos, type ExerciseFull } from "@/components/exercises/ExerciseDetail";

export const metadata: Metadata = { title: "Übungsdetails" };

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  await requireViewer();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  const { data } = await supabase
    .from("exercises")
    .select("*, exercise_media(storage_path, kind, position)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const exercise = data as ExerciseFull & { exercise_media: { storage_path: string; kind: string; position: number }[] };
  const media = [...exercise.exercise_media].filter((m) => m.kind === "video").sort((a, b) => a.position - b.position);
  const urls = await signedUrls(supabase, "exercise-media", media.map((m) => m.storage_path));

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/uebungen" className="text-mute hover:text-paper">
          ← Übungsbibliothek
        </Link>
      </p>
      <PageHeader eyebrow={`Übung ${exercise.code}`} title={exercise.title} />
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ExerciseVideos urls={media.map((m) => urls[m.storage_path]).filter(Boolean)} />
        </div>
        <div className="lg:col-span-2">
          <ExerciseFacts exercise={exercise} />
        </div>
      </div>
    </>
  );
}
