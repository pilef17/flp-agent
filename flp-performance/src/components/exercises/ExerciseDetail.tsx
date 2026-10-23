import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Feedback";
import { CATEGORIES, DIFFICULTY_LABELS, dosage, type Category } from "@/lib/exercises";

export type ExerciseFull = {
  id: string;
  code: string;
  title: string;
  description: string;
  category: Category;
  age_min: number;
  age_max: number;
  difficulty: number;
  sets: number | null;
  repetitions: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  coaching_instructions: string;
  safety_notes: string;
  status: string;
};

export function ExerciseVideos({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-card border border-dashed border-line text-sm text-mute">
        Für diese Übung ist noch kein Video verfügbar.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {urls.map((url, i) => (
        // Signed URL läuft nach einer Stunde ab; Download-Button ausgeblendet
        <video
          key={i}
          src={url}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
          className="aspect-video w-full rounded-card bg-black"
        >
          Dein Browser unterstützt keine Videowiedergabe.
        </video>
      ))}
    </div>
  );
}

export function ExerciseFacts({ exercise }: { exercise: ExerciseFull }) {
  const dose = dosage(exercise);
  const facts = [
    ["Kategorie", CATEGORIES[exercise.category].label],
    ["Alter", `${exercise.age_min}–${exercise.age_max} Jahre`],
    ["Niveau", DIFFICULTY_LABELS[exercise.difficulty]],
    ["Dosierung", dose || "nach Vorgabe des Trainers"],
  ];
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line">
        {facts.map(([k, v]) => (
          <div key={k} className="bg-graphite p-4">
            <dt className="eyebrow">{k}</dt>
            <dd className="mt-1.5 text-sm">{v}</dd>
          </div>
        ))}
      </dl>
      {exercise.description && <p className="whitespace-pre-line leading-relaxed text-mute">{exercise.description}</p>}
      {exercise.coaching_instructions && (
        <Card>
          <p className="eyebrow mb-3">Coaching-Hinweise</p>
          <p className="whitespace-pre-line text-sm leading-relaxed">{exercise.coaching_instructions}</p>
        </Card>
      )}
      {exercise.safety_notes && (
        <div className="rounded-card border border-danger/40 p-5">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-danger">
            Sicherheit <Badge tone="danger">Wichtig</Badge>
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-mute">{exercise.safety_notes}</p>
        </div>
      )}
    </div>
  );
}
