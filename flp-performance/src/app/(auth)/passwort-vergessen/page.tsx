import Link from "next/link";
import type { Metadata } from "next";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Passwort vergessen" };

export default function ForgotPasswordPage() {
  return (
    <>
      <p className="eyebrow mb-3">Zugang wiederherstellen</p>
      <h1 className="mb-3 text-4xl font-extrabold">Passwort vergessen</h1>
      <p className="mb-8 text-sm text-mute">Wir senden dir einen Link, mit dem du ein neues Passwort festlegen kannst.</p>
      <ResetForm />
      <p className="mt-8 text-sm">
        <Link href="/login" className="text-mute hover:text-paper">
          ← Zurück zur Anmeldung
        </Link>
      </p>
    </>
  );
}
