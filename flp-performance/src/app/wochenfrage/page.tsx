import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { currentState, whatsappNumber, THEME_LABEL, TOTAL_WEEKS } from "@/lib/wochenfrage";
import { LANGS, LANG_LABEL, TEXT, longThursdayIn, parseLang, weekTexts } from "@/lib/wochenfrage-i18n";
import { WeeklyForm } from "./WeeklyForm";

export const metadata: Metadata = {
  title: "Wochenfrage",
  description: "Die Frage der Woche von FLP Performance – in wenigen Sekunden beantwortet.",
  openGraph: { title: "FLP Performance · Wochenfrage", description: "Eine kurze Frage zu deinem Training. Antworte in wenigen Sekunden." },
};

export const viewport: Viewport = { themeColor: "#101113", width: "device-width", initialScale: 1 };

export default async function WochenfragePage({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  await connection(); // Frage hängt vom heutigen Datum ab – nie zwischenspeichern
  const { lang: rawLang } = await searchParams;
  const lang = parseLang(Array.isArray(rawLang) ? rawLang[0] : rawLang);
  const t = TEXT[lang];
  const q = currentState();
  const texts = q.status === "active" ? weekTexts(q.weekNumber, lang) : null;
  return (
    <main lang={lang} className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-8 pt-6">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-baseline gap-2 select-none" aria-label="FLP Performance">
          <span className="font-display text-xl font-black tracking-tight" style={{ fontStretch: "75%" }}>
            FLP
          </span>
          <span className="text-[0.625rem] font-medium uppercase tracking-[0.32em] text-gold">Performance</span>
        </p>
        {/* Sprachwahl: der Link bleibt derselbe, nur ?lang ändert sich */}
        <nav aria-label={t.language} className="flex gap-1">
          {LANGS.map((l) => (
            <a
              key={l}
              href={`?lang=${l}`}
              hrefLang={l}
              lang={l}
              aria-current={l === lang ? "true" : undefined}
              className={`grid min-h-9 min-w-9 place-items-center rounded-full border px-2 text-[0.6875rem] font-semibold tracking-wide ${
                l === lang ? "border-gold bg-gold text-ink" : "border-line text-mute hover:text-paper"
              }`}
            >
              {LANG_LABEL[l]}
            </a>
          ))}
        </nav>
      </div>
      {q.status === "active" && texts ? (
        <WeeklyForm
          key={lang}
          lang={lang}
          questionKey={q.questionKey}
          weekNumber={q.weekNumber}
          totalWeeks={TOTAL_WEEKS}
          theme={q.theme}
          focus={texts.focus}
          question={texts.question}
          parentNote={texts.parentNote}
          task={texts.task}
          coachTitle={`${THEME_LABEL[q.theme]} · ${q.focus}`}
          coachQuestion={q.question}
          next={q.nextDate ? longThursdayIn(q.nextDate, lang) : null}
          coachPhone={whatsappNumber(process.env.WOCHENFRAGE_WHATSAPP)}
        />
      ) : (
        <section className="mt-16">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="mt-6 text-4xl font-extrabold">{q.status === "pause" ? t.pauseTitle : t.endedTitle}</h1>
          <p className="mt-3 text-mute">{q.status === "pause" ? t.pauseText(longThursdayIn(q.nextDate, lang)) : t.endedText}</p>
        </section>
      )}
    </main>
  );
}
