import { describe, expect, it } from "vitest";
import { homePathFor, isProtectedPath, navFor, safeNextPath } from "./routes";

describe("safeNextPath", () => {
  it("erlaubt interne Pfade", () => {
    expect(safeNextPath("/elternbereich")).toBe("/elternbereich");
    expect(safeNextPath("/admin/spieler?q=lio")).toBe("/admin/spieler?q=lio");
  });
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, undefined])(
    "blockiert externen/ungültigen Pfad %s",
    (value) => {
      expect(safeNextPath(value as string | null | undefined)).toBe("/startseite");
    },
  );
});

describe("Rollen-Navigation", () => {
  it("leitet je Rolle auf die passende Startseite", () => {
    expect(homePathFor(["admin"])).toBe("/admin");
    expect(homePathFor(["coach"])).toBe("/admin");
    expect(homePathFor(["parent"])).toBe("/elternbereich");
    expect(homePathFor(["player"])).toBe("/startseite");
    expect(homePathFor([])).toBe("/konto");
  });
  it("zeigt Datenschutz-Verwaltung nur dem Admin", () => {
    expect(navFor(["admin"]).some((i) => i.href === "/admin/datenschutz")).toBe(true);
    expect(navFor(["coach"]).some((i) => i.href === "/admin/datenschutz")).toBe(false);
    expect(navFor(["parent"]).some((i) => i.href.startsWith("/admin"))).toBe(false);
  });
  it("schützt private Bereiche", () => {
    expect(isProtectedPath("/admin")).toBe(true);
    expect(isProtectedPath("/admin/spieler/123")).toBe(true);
    expect(isProtectedPath("/elternbereich")).toBe(true);
    expect(isProtectedPath("/uebungen/abc")).toBe(true);
    expect(isProtectedPath("/trainingsplan")).toBe(true);
    expect(isProtectedPath("/spieler/abc")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/administration-fake")).toBe(false);
  });
});
