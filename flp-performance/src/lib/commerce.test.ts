import { describe, expect, it } from "vitest";
import { accessLabel, isEntitlementActive, parseChf, slugify } from "./commerce";

describe("parseChf", () => {
  it("liest Schweizer Preisformate", () => {
    expect(parseChf("39")).toBe(3900);
    expect(parseChf("39.00")).toBe(3900);
    expect(parseChf("39,50")).toBe(3950);
    expect(parseChf("CHF 59.-")).toBe(5900);
    expect(parseChf("1'200.00")).toBe(120000);
    expect(parseChf("0.5")).toBe(50);
  });
  it("lehnt Ungültiges ab", () => {
    for (const v of ["", "abc", "-5", "39.999", "1e3"]) expect(parseChf(v)).toBeNull();
  });
});

describe("Zugang", () => {
  const now = new Date("2026-10-23T12:00:00Z");
  it("prüft Laufzeit und Entzug", () => {
    expect(isEntitlementActive({ starts_at: "2026-01-01T00:00:00Z", ends_at: null, revoked_at: null }, now)).toBe(true);
    expect(isEntitlementActive({ starts_at: "2026-01-01T00:00:00Z", ends_at: "2026-10-01T00:00:00Z", revoked_at: null }, now)).toBe(false);
    expect(isEntitlementActive({ starts_at: "2026-01-01T00:00:00Z", ends_at: null, revoked_at: "2026-05-01T00:00:00Z" }, now)).toBe(false);
  });
  it("beschreibt die Zugangsdauer", () => {
    expect(accessLabel(null)).toBe("Unbefristeter Zugang");
    expect(accessLabel(365)).toBe("12 Monate Zugang");
    expect(accessLabel(90)).toBe("3 Monate Zugang");
    expect(accessLabel(10)).toBe("10 Tage Zugang");
  });
  it("erzeugt saubere Slugs", () => {
    expect(slugify("FLP Ernährung für Spieler!")).toBe("flp-ernaehrung-fuer-spieler");
  });
});
