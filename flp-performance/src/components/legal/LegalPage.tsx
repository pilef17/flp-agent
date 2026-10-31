import { Logo } from "@/components/ui/Logo";
import { LEGAL_UPDATED } from "@/lib/legal";
import { LegalLinks } from "./LegalLinks";

/** Rahmen für Impressum, Datenschutzerklärung und AGB. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Logo />
      <h1 className="mt-12 text-4xl font-extrabold">{title}</h1>
      <p className="mt-3 text-sm text-mute">Stand: {LEGAL_UPDATED}</p>
      <div className="mt-10 space-y-8 leading-relaxed text-mute [&_a]:text-gold [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-paper [&_li]:mt-1 [&_p+p]:mt-3 [&_strong]:text-paper [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
      <div className="mt-14 border-t border-line pt-6">
        <LegalLinks />
      </div>
    </main>
  );
}
