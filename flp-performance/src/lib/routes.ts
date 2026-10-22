export type Role = "admin" | "coach" | "parent" | "player";

const PROTECTED_PREFIXES = [
  "/startseite",
  "/elternbereich",
  "/spieler",
  "/trainingsplan",
  "/uebungen",
  "/entwicklung",
  "/feedback",
  "/konto",
  "/admin",
  "/passwort-neu",
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Verhindert Open Redirects: nur relative, interne Pfade sind erlaubt. */
export function safeNextPath(next: string | null | undefined, fallback = "/startseite"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  try {
    const url = new URL(next, "http://flp.local");
    if (url.origin !== "http://flp.local") return fallback;
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}

export function isStaff(roles: readonly Role[]): boolean {
  return roles.includes("admin") || roles.includes("coach");
}

/** Einstiegsseite je nach Rolle. Nur Darstellung – Berechtigung prüft die Datenbank. */
export function homePathFor(roles: readonly Role[]): string {
  if (isStaff(roles)) return "/admin";
  if (roles.includes("parent")) return "/elternbereich";
  if (roles.includes("player")) return "/startseite";
  return "/konto";
}

export type NavItem = {
  href: string;
  label: string;
  /** Kurzlabel für die mobile Leiste */
  short?: string;
  /** In der mobilen Leiste ausblenden (über andere Seiten erreichbar) */
  desktopOnly?: boolean;
};

export function navFor(roles: readonly Role[]): NavItem[] {
  if (isStaff(roles)) {
    const items: NavItem[] = [
      { href: "/admin", label: "Übersicht", short: "Start" },
      { href: "/admin/spieler", label: "Spieler" },
      { href: "/admin/uebungen", label: "Übungen" },
      { href: "/admin/beurteilungen", label: "Beurteilungen", short: "Bewertung" },
    ];
    if (roles.includes("admin")) items.push({ href: "/admin/datenschutz", label: "Datenschutz", desktopOnly: true });
    items.push({ href: "/konto", label: "Konto" });
    return items;
  }
  if (roles.includes("parent")) {
    return [
      { href: "/elternbereich", label: "Übersicht", short: "Start" },
      { href: "/trainingsplan", label: "Trainingsplan", short: "Plan" },
      { href: "/uebungen", label: "Übungen" },
      { href: "/entwicklung", label: "Entwicklung" },
      { href: "/konto", label: "Konto" },
    ];
  }
  return [
    { href: "/startseite", label: "Startseite", short: "Start" },
    { href: "/trainingsplan", label: "Trainingsplan", short: "Plan" },
    { href: "/uebungen", label: "Übungen" },
    { href: "/entwicklung", label: "Entwicklung" },
    { href: "/konto", label: "Konto" },
  ];
}
