import Link from "next/link";
import type { MyPlayer } from "@/lib/data/my-players";

/** Kinderwahl (nur sichtbar bei mehreren Kindern). */
export function PlayerSwitcher({
  players,
  activeId,
  href,
}: {
  players: MyPlayer[];
  activeId: string;
  href: (playerId: string) => string;
}) {
  if (players.length < 2) return null;
  return (
    <nav aria-label="Kind wählen" className="mb-6 flex flex-wrap gap-2">
      {players.map((p) => (
        <Link
          key={p.id}
          href={href(p.id)}
          aria-current={p.id === activeId ? "true" : undefined}
          className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm ${p.id === activeId ? "border-gold bg-gold text-ink" : "border-line text-mute hover:text-paper"}`}
        >
          {p.first_name}
        </Link>
      ))}
    </nav>
  );
}
