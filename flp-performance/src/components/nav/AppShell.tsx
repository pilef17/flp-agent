import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { signOut } from "@/app/(auth)/actions";
import { navFor, homePathFor } from "@/lib/routes";
import type { Viewer } from "@/lib/auth";
import { NavLinks } from "./NavLinks";

const ROLE_LABEL = { admin: "Administrator", coach: "Trainer", parent: "Elternteil", player: "Spieler" } as const;

export function AppShell({ viewer, children }: { viewer: Viewer; children: React.ReactNode }) {
  const items = navFor(viewer.roles);
  const primaryRole = viewer.roles.includes("admin")
    ? "admin"
    : viewer.roles.includes("coach")
      ? "coach"
      : viewer.roles.includes("parent")
        ? "parent"
        : "player";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <Logo href={homePathFor(viewer.roles)} />
          <nav aria-label="Hauptnavigation" className="hidden md:block">
            <NavLinks items={items} />
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/konto" className="hidden text-right leading-tight hover:text-gold sm:block">
              <span className="block text-sm">{viewer.fullName || viewer.email}</span>
              <span className="block text-[0.6875rem] uppercase tracking-wider text-gold">{ROLE_LABEL[primaryRole]}</span>
            </Link>
            <Link href="/konto" className="min-h-11 content-center text-sm text-mute hover:text-paper md:hidden">
              Konto
            </Link>
            <form action={signOut}>
              <button className="min-h-11 text-sm text-mute hover:text-paper" type="submit">
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-8 sm:px-8 sm:pt-12 md:pb-16">{children}</main>
      {/* Mobile Navigation */}
      <nav aria-label="Mobile Navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 backdrop-blur md:hidden">
        <NavLinks items={items} mobile />
      </nav>
    </div>
  );
}
