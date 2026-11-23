import { describe, expect, it } from "vitest";
import { dayLabel, decisionMail, newRequestMail, requestLine, requestSchema } from "./training-requests";

const id = "00000000-0000-4000-8000-000000000001";

describe("Trainingsanfragen", () => {
  it("prüft Datum und Wunschzeit", () => {
    const s = requestSchema("2026-12-01");
    expect(s.safeParse({ playerId: id, day: "2026-12-05", wishTimes: " 9:00 /  9:30 ", location: "Hardhof", note: "" }).data?.wishTimes).toBe("9:00 / 9:30");
    expect(s.safeParse({ playerId: id, day: "2026-11-30", wishTimes: "9:00", location: "", note: "" }).success).toBe(false);
    expect(s.safeParse({ playerId: id, day: "2027-06-01", wishTimes: "9:00", location: "", note: "" }).success).toBe(false);
    expect(s.safeParse({ playerId: id, day: "2026-12-05", wishTimes: "  ", location: "", note: "" }).success).toBe(false);
  });
  it("schreibt Zeilen wie in der Notizen-Liste", () => {
    expect(dayLabel("2026-12-05")).toBe("Sa 05.12.");
    expect(requestLine("Liam", { day: "2026-12-05", wish_times: "9:00 / 9:30", location: "Hardhof" })).toBe("Liam – 9:00 / 9:30 – Hardhof");
    expect(requestLine("Liam", { day: "2026-12-05", wish_times: "9:00 / 9:30", location: "", status: "bestaetigt", confirmed_time: "9:30" })).toBe("Liam – 9:30");
  });
  it("baut die E-Mails", () => {
    const n = newRequestMail({ playerName: "Liam", parentName: "Anna", day: "2026-12-05", wish_times: "9:00 / 9:30", location: "Hardhof" }, "https://x");
    expect(n.subject).toBe("Terminanfrage: Liam – Sa 05.12. 9:00 / 9:30");
    expect(n.text).toContain("https://x/admin/agenda?w=2026-12-05");
    const d = decisionMail({ playerName: "Liam", status: "bestaetigt", day: "2026-12-05", wish_times: "9:00 / 9:30", location: "Hardhof", confirmed_time: "9:30", coachNote: "Platz 2" }, "https://x");
    expect(d.subject).toBe("Training bestätigt: Liam – Sa 05.12.");
    expect(d.text).toContain("Zeit: 9:30");
    expect(d.text).toContain("Nachricht: Platz 2");
    expect(decisionMail({ playerName: "Liam", status: "abgelehnt", day: "2026-12-05", wish_times: "9:00", location: "" }, "x").subject).toContain("abgesagt");
  });
});
