import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { currentQuestion } from "@/lib/wochenfrage";
import { WeeklyForm } from "./WeeklyForm";

export const metadata: Metadata = {
  title: "Wochenfrage",
  description: "Die Frage der Woche von FLP Performance – in wenigen Sekunden beantwortet.",
  openGraph: { title: "FLP Performance · Wochenfrage", description: "Eine kurze Frage zu deinem Training. Antworte in wenigen Sekunden." },
};

export const viewport: Viewport = { themeColor: "#101113", width: "device-width", initialScale: 1 };

export default async function WochenfragePage() {
  await connection(); // Frage hängt vom heutigen Datum ab – nie zwischenspeichern
  const q = currentQuestion();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-10 pt-6">
      <p className="flex items-baseline gap-2 select-none" aria-label="FLP Performance">
        <span className="font-display text-xl font-black tracking-tight" style={{ fontStretch: "75%" }}>
          FLP
        </span>
        <span className="text-[0.625rem] font-medium uppercase tracking-[0.32em] text-gold">Performance</span>
      </p>
      <WeeklyForm questionKey={q.questionKey} themeLabel={q.themeLabel} question={q.question} />
    </main>
  );
}
