import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-5 text-center">
      <p className="eyebrow mb-3">404</p>
      <h1 className="text-4xl font-extrabold">Seite nicht gefunden</h1>
      <p className="mt-3 text-mute">Diese Seite existiert nicht oder du hast keinen Zugriff darauf.</p>
      <ButtonLink href="/" className="mt-8">
        Zur Startseite
      </ButtonLink>
    </main>
  );
}
