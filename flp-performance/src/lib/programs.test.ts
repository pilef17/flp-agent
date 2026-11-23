import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { exportPrograms } from "../../scripts/flp-app-export.mjs";
import { parseSessionData, programImportSchema, sessionMinutes } from "./programs";
import { POSITIONS, isPositionProduct, positionProductSlug } from "./positions";

const appHtml = path.resolve(__dirname, "../../../flp-app/index.html");

describe("Positionsprogramme", () => {
  it("liest Einheiten tolerant", () => {
    expect(parseSessionData({ level: "pro", exercises: [{ name: "Sprint", minutes: 10 }, { name: "Pass", minutes: 5 }] })).not.toBeNull();
    expect(parseSessionData({ level: "x" })).toBeNull();
    expect(parseSessionData(null)).toBeNull();
    const d = parseSessionData({ level: "jugend", exercises: [{ name: "A", minutes: 10 }, { name: "B", minutes: 5 }] })!;
    expect(sessionMinutes(d)).toBe(15);
    expect(sessionMinutes({ ...d, minutes: 60 })).toBe(60);
  });

  it("erkennt Positionsprogramme am Slug", () => {
    expect(isPositionProduct("jugend-fluegelspieler")).toBe(true);
    expect(isPositionProduct("pro-stuermer")).toBe(true);
    expect(isPositionProduct("flp-training")).toBe(false);
    expect(isPositionProduct("pro-mittelfeld")).toBe(false);
  });

  it("lehnt ungültige Importe ab", () => {
    const product = { slug: "pro-test", title: "Pro · Test", price_cents: 6900, access_days: 183, sessions: [{ title: "Einheit 1", data: { level: "pro" } }] };
    expect(programImportSchema.safeParse({ version: 1, products: [product] }).success).toBe(true);
    expect(programImportSchema.safeParse({ version: 2, products: [product] }).success).toBe(false);
    expect(programImportSchema.safeParse({ version: 1, products: [{ ...product, slug: "Pro Test" }] }).success).toBe(false);
    expect(programImportSchema.safeParse({ version: 1, products: [{ ...product, price_cents: 10 }] }).success).toBe(false);
    expect(programImportSchema.safeParse({ version: 1, products: [{ ...product, sessions: [] }] }).success).toBe(false);
  });

  it.skipIf(!fs.existsSync(appHtml))("exportiert die Programme der Netlify-App im gültigen Format", () => {
    const html = fs.readFileSync(appHtml, "utf8");
    for (const level of ["jugend", "pro"] as const) {
      const out = exportPrograms(html, level);
      const parsed = programImportSchema.safeParse(out);
      expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues[0])).toBe(true);
      if (!parsed.success) continue;
      expect(parsed.data.products).toHaveLength(7);
      expect(parsed.data.products.every((p) => p.slug.startsWith(`${level}-`))).toBe(true);
      // Positionswahl im Shop findet jedes exportierte Programm
      expect(parsed.data.products.map((p) => p.slug).sort()).toEqual(POSITIONS.map((p) => positionProductSlug(level, p.slug)).sort());
      // Upload-Limit der Server Action
      expect(JSON.stringify(out).length).toBeLessThan(900_000);
    }
  });
});
