import Link from "next/link";
import { Badge } from "@/components/ui/Feedback";
import { weekdayName, shortDate } from "@/lib/dates";
import type { SessionView } from "@/lib/data/week-plan";
import { toggleCompletion } from "./completion-actions";

export function SessionBlock({ session, showDate = true }: { session: SessionView; showDate?: boolean }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {showDate && (
            <p className="text-xs uppercase tracking-wider text-mute">
              {weekdayName(session.scheduledOn)}, {shortDate(session.scheduledOn)}
            </p>
          )}
          <p className="font-semibold">{session.title}</p>
          {session.notes && <p className="mt-1 whitespace-pre-line text-sm text-mute">{session.notes}</p>}
        </div>
        <CompletionButton sessionId={session.id} done={session.completed} label="Einheit" />
      </div>
      {session.exercises.length > 0 && (
        <ul className="mt-3 space-y-2">
          {session.exercises.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 rounded-card bg-ink px-3 py-2.5 text-sm">
              <Link href={`/uebungen/${e.exerciseId}`} className="min-w-0 flex-1 hover:text-gold">
                <span className="block truncate">
                  <span className="mr-2 text-xs text-gold">{e.code}</span>
                  {e.title}
                </span>
                {(e.dosage || e.notes) && (
                  <span className="block truncate text-xs text-mute">{[e.dosage, e.notes].filter(Boolean).join(" · ")}</span>
                )}
              </Link>
              <CompletionButton sessionId={session.id} sessionExerciseId={e.id} done={e.completed} label="Übung" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CompletionButton({
  sessionId,
  sessionExerciseId = "",
  done,
  label,
}: {
  sessionId: string;
  sessionExerciseId?: string;
  done: boolean;
  label: string;
}) {
  return (
    <form action={toggleCompletion} className="shrink-0">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="sessionExerciseId" value={sessionExerciseId} />
      <input type="hidden" name="done" value={done ? "false" : "true"} />
      <button type="submit" className="min-h-11 px-1">
        <span className="sr-only">{done ? `${label} als offen markieren – ` : `${label} als erledigt markieren – `}</span>
        {done ? <Badge tone="ok">Erledigt ✓</Badge> : <Badge>Offen</Badge>}
      </button>
    </form>
  );
}
