import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/Feedback";
import { NewPasswordForm } from "./NewPasswordForm";

export const metadata: Metadata = { title: "Neues Passwort" };

export default function NewPasswordPage() {
  return (
    <div className="max-w-md">
      <PageHeader eyebrow="Konto" title="Neues Passwort" text="Lege ein neues Passwort mit mindestens 10 Zeichen fest." />
      <NewPasswordForm />
    </div>
  );
}
