"use client";

import { Button } from "@/components/ui/Button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="eyebrow mb-3">Fehler</p>
      <h1 className="text-3xl font-bold">Etwas ist schiefgelaufen</h1>
      <p className="mt-3 text-mute">Die Seite konnte nicht geladen werden. Bitte versuche es erneut.</p>
      <Button className="mt-8" onClick={reset}>
        Erneut versuchen
      </Button>
    </div>
  );
}
