import { describe, expect, it } from "vitest";
import { consentSchema, playerSchema, privacyRequestSchema, registerSchema } from "./validation";
import { latestConsents } from "./consent";

describe("Validierung", () => {
  it("verlangt Zustimmung zur Datenschutzerklärung", () => {
    const res = registerSchema.safeParse({ fullName: "A B", email: "a@b.ch", password: "1234567890", passwordConfirm: "1234567890" });
    expect(res.success).toBe(false);
  });
  it("prüft Passwort-Bestätigung", () => {
    const res = registerSchema.safeParse({ fullName: "A B", email: "a@b.ch", password: "1234567890", passwordConfirm: "x", privacy: "on" });
    expect(res.success).toBe(false);
  });
  it("akzeptiert gültige Registrierung und normalisiert E-Mail", () => {
    const res = registerSchema.safeParse({ fullName: "A B", email: " A@B.CH ", password: "1234567890", passwordConfirm: "1234567890", privacy: "on" });
    expect(res.success && res.data.email).toBe("a@b.ch");
  });
  it("begrenzt das Geburtsjahr auf sinnvolle Werte", () => {
    const y = new Date().getFullYear();
    expect(playerSchema.safeParse({ firstName: "L", lastName: "T", birthYear: y - 10 }).success).toBe(true);
    expect(playerSchema.safeParse({ firstName: "L", lastName: "T", birthYear: y - 30 }).success).toBe(false);
    expect(playerSchema.safeParse({ firstName: "L", lastName: "T", birthYear: y }).success).toBe(false);
  });
  it("lehnt unbekannte Antrags- und Einwilligungsarten ab", () => {
    expect(privacyRequestSchema.safeParse({ requestType: "hack" }).success).toBe(false);
    expect(consentSchema.safeParse({ playerId: crypto.randomUUID(), consentType: "x", granted: "true" }).success).toBe(false);
  });
});

describe("latestConsents", () => {
  it("nimmt die jeweils neueste Erklärung", () => {
    const res = latestConsents([
      { consent_type: "data_processing", granted: true, created_at: "2026-01-01T00:00:00Z" },
      { consent_type: "data_processing", granted: false, created_at: "2026-02-01T00:00:00Z" },
      { consent_type: "video_recording", granted: true, created_at: "2026-01-05T00:00:00Z" },
    ]);
    expect(res).toEqual({ data_processing: false, video_recording: true });
  });
});
