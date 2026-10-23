import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Registrieren" };

export default function RegisterPage() {
  return (
    <>
      <p className="eyebrow mb-3">Für Eltern und Kunden</p>
      <h1 className="mb-3 text-4xl font-extrabold">Konto erstellen</h1>
      <p className="mb-8 text-sm text-mute">
        Konten für Kinder werden ausschliesslich von Eltern bzw. Erziehungsberechtigten und dem Trainer verwaltet.
      </p>
      <RegisterForm />
      <p className="mt-8 text-sm text-mute">
        Bereits registriert?{" "}
        <Link href="/login" className="text-gold underline underline-offset-4 hover:text-paper">
          Anmelden
        </Link>
      </p>
    </>
  );
}
