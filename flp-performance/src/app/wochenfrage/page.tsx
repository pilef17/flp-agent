import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { currentState, longThursday, whatsappNumber, TOTAL_WEEKS } from "@/lib/wochenfrage";
import { WeeklyForm } from "./WeeklyForm";

export const metadata: Metadata = {
  title: "Wochenfrage",
  description: "Die Frage der Woche von FLP Performance – in wenigen Sekunden beantwortet.",
  openGraph: { title: "FLP Performance · Wochenfrage", description: "Eine kurze Frage zu deinem Training. Antworte in wenigen Sekunden." },
};

export const viewport: Viewport = { themeColor: "#101113", width: "device-width", initialScale: 1 };

export default async function WochenfragePage() {
  await connection(); // Frage hängt vom heutigen Datum ab – nie zwischenspeichern
  const q = currentState();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-8 pt-6">
      <p className="flex items-baseline gap-2 select-none" aria-label="FLP Performance">
        <span className="font-display text-xl font-black tracking-tight" style={{ fontStretch: "75%" }}>
          FLP
        </span>
        <span className="text-[0.625rem] font-medium uppercase tracking-[0.32em] text-gold">Performance</span>
      </p>
      {q.status === "active" ? (
        <WeeklyForm
          questionKey={q.questionKey}
          weekNumber={q.weekNumber}
          totalWeeks={TOTAL_WEEKS}
          theme={q.theme}
          focus={q.focus}
          question={q.question}
          parentNote={q.parentNote}
          task={q.task}
          next={q.nextDate ? longThursday(q.nextDate) : null}
          coachPhone={whatsappNumber(process.env.WOCHENFRAGE_WHATSAPP)}
        />
      ) : (
        <section className="mt-16">
          <p className="eyebrow">Wochenfrage</p>
          <h1 className="mt-6 text-4xl font-extrabold">{q.status === "pause" ? "Pause über die Feiertage" : "Zyklus abgeschlossen"}</h1>
          <p className="mt-3 text-mute">
            {q.status === "pause"
              ? `Diese Woche gibt es keine Frage. Die nächste kommt am ${longThursday(q.nextDate)}.`
              : "Danke fürs Mitmachen! Jetzt folgt die neue Beurteilung – die nächste Wochenfrage kommt mit dem neuen Zyklus."}
          </p>
        </section>
      )}
    </main>
  );
}
