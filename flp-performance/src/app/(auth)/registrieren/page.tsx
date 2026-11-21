import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Registrieren" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const buying = next?.startsWith("/programme/") ?? false;
  return (
    <>
      <p className="eyebrow mb-3">Für Eltern und Kunden</p>
      <h1 className="mb-3 text-4xl font-extrabold">Konto erstellen</h1>
      <p className="mb-8 text-sm text-mute">
        {buying
          ? "Nach der Bestätigung deiner E-Mail kommst du direkt zurück zum Programm und kannst es kaufen."
          : "Konten für Kinder werden ausschliesslich von Eltern bzw. Erziehungsberechtigten und dem Trainer verwaltet."}
      </p>
      <RegisterForm next={next ?? ""} />
      <p className="mt-8 text-sm text-mute">
        Bereits registriert?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-gold underline underline-offset-4 hover:text-paper">
          Anmelden
        </Link>
      </p>
    </>
  );
}
