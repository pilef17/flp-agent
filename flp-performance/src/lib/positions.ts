/** Positionen der Positionsprogramme (Shop-Slugs: «jugend-<slug>» / «pro-<slug>»). Koordinaten in % des Spielfelds. */
export const POSITIONS = [
  { slug: "goalie", num: "1", name: "Goalie", motto: "Letzter Verteidiger, erster Angreifer", x: 8, y: 50 },
  { slug: "innenverteidiger", num: "4", name: "Innenverteidiger", motto: "Mauer und erster Pass", x: 24, y: 36 },
  { slug: "aussenverteidiger", num: "2", name: "Aussenverteidiger", motto: "Die ganze Seite gehört dir", x: 30, y: 84 },
  { slug: "sechser", num: "6", name: "Sechser", motto: "Das Gleichgewicht des Teams", x: 42, y: 50 },
  { slug: "zehner", num: "10", name: "Zehner", motto: "Das Gehirn der Offensive", x: 62, y: 50 },
  { slug: "fluegelspieler", num: "7", name: "Flügelspieler", motto: "Tempo und Durchbruch", x: 72, y: 16 },
  { slug: "stuermer", num: "9", name: "Stürmer", motto: "Tore schiessen ist der Job", x: 86, y: 50 },
] as const;

export const LEVELS = {
  jugend: { label: "Jugend · bis 16", short: "Jugend" },
  pro: { label: "Pro · 17+", short: "Pro 17+" },
} as const;

export type Level = keyof typeof LEVELS;

export function positionProductSlug(level: Level, positionSlug: string): string {
  return `${level}-${positionSlug}`;
}

/** Gehört ein Shop-Produkt zu einem Positionsprogramm? */
export function isPositionProduct(slug: string): boolean {
  return POSITIONS.some((p) => slug === positionProductSlug("jugend", p.slug) || slug === positionProductSlug("pro", p.slug));
}
