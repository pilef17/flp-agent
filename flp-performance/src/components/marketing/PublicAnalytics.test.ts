import { describe, expect, it } from "vitest";
import { publicEvent } from "./PublicAnalytics";

const ev = (path: string) => publicEvent({ type: "pageview", url: `https://flp.example${path}` });

describe("Analytics nur für öffentliche Seiten", () => {
  it("zählt Startseite, Check und Shop", () => {
    expect(ev("/")?.url).toBe("https://flp.example/");
    expect(ev("/check")?.url).toBe("https://flp.example/check");
    expect(ev("/programme")).not.toBeNull();
    expect(ev("/programme/winterpause-mittel")).not.toBeNull();
  });
  it("entfernt Parameter", () => {
    expect(ev("/programme/x?abgebrochen=1")?.url).toBe("https://flp.example/programme/x");
  });
  it("ignoriert Konten, Admin und gekaufte Inhalte", () => {
    for (const p of ["/admin", "/admin/check", "/elternbereich", "/spieler/abc", "/programme/x/inhalt", "/login", "/konto"]) {
      expect(ev(p)).toBeNull();
    }
  });
});
