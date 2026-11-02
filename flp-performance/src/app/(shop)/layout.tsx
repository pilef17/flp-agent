import { LegalLinks } from "@/components/legal/LegalLinks";
import { AppShell } from "@/components/nav/AppShell";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { getViewer } from "@/lib/auth";

/** Shop ist öffentlich einsehbar; angemeldete Benutzer sehen ihre normale Navigation. */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (viewer) return <AppShell viewer={viewer}>{children}</AppShell>;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
          <Logo />
          <ButtonLink href="/login" variant="ghost">
            Anmelden
          </ButtonLink>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-8 sm:pt-12">{children}</main>
      <footer className="border-t border-line">
        <LegalLinks className="mx-auto max-w-6xl px-4 py-4 sm:px-8" />
      </footer>
    </div>
  );
}
