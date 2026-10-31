import Link from "next/link";

const LINKS = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/agb", label: "AGB" },
];

export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Rechtliches" className={`flex flex-wrap gap-x-6 gap-y-2 text-sm text-mute ${className}`}>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="min-h-11 content-center underline underline-offset-4 hover:text-paper">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
