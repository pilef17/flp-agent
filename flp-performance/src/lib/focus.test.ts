import { describe, expect, it } from "vitest";
import { FOCUS_KEYS, isFocus, timeRange } from "./focus";

describe("focus", () => {
  it("kennt die Fokuswerte der Datenbank", () => {
    expect(FOCUS_KEYS).toEqual(["kraft", "power", "ausdauer", "schnelligkeit", "technik", "spiel", "regeneration"]);
    expect(isFocus("kraft")).toBe(true);
    expect(isFocus("ruhetag")).toBe(false);
    expect(isFocus(null)).toBe(false);
  });

  it("formatiert Zeitfenster", () => {
    expect(timeRange("11:00:00", "12:30:00")).toBe("11:00–12:30");
    expect(timeRange("09:15", null)).toBe("ab 09:15");
    expect(timeRange(null, "12:30")).toBeNull();
  });
});
