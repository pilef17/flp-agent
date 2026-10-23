import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,32rem)]">
      <aside className="hidden flex-col justify-between border-r border-line p-12 lg:flex">
        <Logo size="lg" />
        <blockquote className="max-w-md">
          <p className="font-display text-4xl font-bold uppercase leading-tight" style={{ fontStretch: "72%" }}>
            Jeder Spieler ist anders. <span className="text-gold">Deshalb trainieren wir individuell.</span>
          </p>
        </blockquote>
        <p className="text-xs text-mute">© FLP Performance · Schweiz</p>
      </aside>
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center">
          <div className="w-full max-w-sm py-10">{children}</div>
        </div>
      </div>
    </main>
  );
}
