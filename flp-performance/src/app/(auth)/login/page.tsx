import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; fehler?: string }> }) {
  const { next, fehler } = await searchParams;
  return (
    <>
      <p className="eyebrow mb-3">Willkommen zurück</p>
      <h1 className="mb-8 text-4xl font-extrabold">Anmelden</h1>
      <LoginForm next={next ?? ""} linkError={fehler === "link"} />
      <div className="mt-8 space-y-2 text-sm text-mute">
        <p>
          <Link href="/passwort-vergessen" className="text-paper underline-offset-4 hover:underline">
            Passwort vergessen?
          </Link>
        </p>
        <p>
          Noch kein Konto?{" "}
          <Link href="/registrieren" className="text-gold underline-offset-4 hover:underline">
            Jetzt registrieren
          </Link>
        </p>
      </div>
    </>
  );
}
