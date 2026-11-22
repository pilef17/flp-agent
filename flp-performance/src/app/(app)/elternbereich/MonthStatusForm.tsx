"use client";

import { useActionState, useState } from "react";
import { todayInSwitzerland } from "@/lib/dates";
import { PAUSE_REASONS, dayLabel, daysOfMonth, monthLabel, statusLabel, weekdayShort, type PauseReason } from "@/lib/month-status";
import { setMonthStatus, type MonthStatusState } from "./actions";

type Status = { active: boolean; reason: string; note: string; dates: string[] } | null;
type Panel = "pause" | "dates";

const WEEK_HEAD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Ein Monat: Status anzeigen, als Aktiv oder Pausiert melden und Wunschtermine wählen. */
export function MonthStatusForm({ playerId, firstName, month, status }: { playerId: string; firstName: string; month: string; status: Status }) {
  const [state, action, pending] = useActionState<MonthStatusState, FormData>(setMonthStatus, {});
  // Ein Panel gilt nur für den Stand, in dem es geöffnet wurde: nach dem Senden schliesst es sich.
  const [opened, setOpened] = useState<{ panel: Panel; for: MonthStatusState } | null>(null);
  const panel = opened && opened.for === state ? opened.panel : null;
  const [picked, setPicked] = useState<string[]>(status?.dates ?? []);
  const label = monthLabel(month);
  const tone = !status ? "text-mute" : status.active ? "text-ok" : "text-gold";
  const savedDates = status?.active ? status.dates : [];
  const today = todayInSwitzerland();
  const days = daysOfMonth(month);
  const lead = (new Date(`${month}T00:00:00Z`).getUTCDay() + 6) % 7; // leere Felder vor dem 1.
  const toggle = (d: string) => setPicked((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()));
  const hidden = (active: boolean, dates: string[]) => (
    <>
      <input type="hidden" name="playerId" value={playerId} />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="active" value={String(active)} />
      {active && <input type="hidden" name="dates" value={dates.join(",")} />}
    </>
  );

  return (
    <div className="rounded-card border border-line p-4" data-testid={`month-${month.slice(0, 7)}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{label}</p>
        <p className={`text-sm font-semibold ${tone}`}>{statusLabel(status)}</p>
      </div>
      {status?.note && <p className="mt-1 text-xs text-mute">«{status.note}»</p>}
      {status?.active && (
        <p className="mt-1 text-xs text-mute">
          Wunschtermine: {savedDates.length ? savedDates.map(dayLabel).join(", ") : "noch keine gewählt"}
        </p>
      )}
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      {panel === null && (
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={action}>
            {hidden(true, savedDates)}
            <button
              type="submit"
              disabled={pending}
              aria-label={`${firstName} trainiert im ${label} – Aktiv`}
              className={`min-h-11 rounded-card border px-4 text-sm ${status?.active ? "border-ok text-ok" : "border-line hover:border-ok"}`}
            >
              🟢 Aktiv
            </button>
          </form>
          <button
            type="button"
            onClick={() => setOpened({ panel: "pause", for: state })}
            aria-label={`${firstName} pausiert im ${label}`}
            className={`min-h-11 rounded-card border px-4 text-sm ${status && !status.active ? "border-gold text-gold" : "border-line hover:border-gold"}`}
          >
            ⏸️ Pausiert
          </button>
          <button
            type="button"
            onClick={() => {
              setPicked(savedDates);
              setOpened({ panel: "dates", for: state });
            }}
            className="min-h-11 rounded-card border border-line px-4 text-sm hover:border-gold"
          >
            📅 Termine wählen
          </button>
        </div>
      )}

      {panel === "pause" && (
        <form action={action} className="mt-3 space-y-3">
          {hidden(false, [])}
          <fieldset>
            <legend className="mb-2 text-sm text-mute">Grund</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PAUSE_REASONS) as PauseReason[]).map((r, i) => (
                <label key={r} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-card border border-line px-3 text-sm has-[:checked]:border-gold">
                  <input type="radio" name="reason" value={r} defaultChecked={status?.reason ? status.reason === r : i === 0} className="accent-gold" />
                  {PAUSE_REASONS[r]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm">
            <span className="text-mute">Bemerkung (optional)</span>
            <input name="note" maxLength={200} defaultValue={status?.note ?? ""} className="mt-1 block min-h-11 w-full rounded-card border border-line bg-ink px-3 text-paper" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="min-h-11 rounded-card bg-gold px-4 text-sm font-semibold text-ink hover:bg-gold-soft">
              Pause melden
            </button>
            <button type="button" onClick={() => setOpened(null)} className="min-h-11 rounded-card border border-line px-4 text-sm text-mute hover:text-paper">
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {panel === "dates" && (
        <form action={action} className="mt-3 space-y-3">
          {hidden(true, picked)}
          <fieldset>
            <legend className="mb-2 text-sm text-mute">An welchen Tagen wünschst du ein Training?</legend>
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEK_HEAD.map((w) => (
                <span key={w} aria-hidden className="pb-1 text-xs text-mute">
                  {w}
                </span>
              ))}
              {Array.from({ length: lead }, (_, i) => (
                <span key={`e${i}`} aria-hidden />
              ))}
              {days.map((d) => {
                const on = picked.includes(d);
                const past = d < today;
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={past}
                    aria-pressed={on}
                    aria-label={`${weekdayShort(d)} ${Number(d.slice(8))}.`}
                    onClick={() => toggle(d)}
                    className={`min-h-10 rounded-card border text-sm tabular-nums ${
                      on ? "border-gold bg-gold text-ink" : past ? "border-transparent text-mute/50" : "border-line hover:border-gold"
                    }`}
                  >
                    {Number(d.slice(8))}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <p className="text-xs text-mute">{picked.length ? `Gewählt: ${picked.map(dayLabel).join(", ")}` : "Noch keine Tage gewählt."}</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="min-h-11 rounded-card bg-gold px-4 text-sm font-semibold text-ink hover:bg-gold-soft">
              Termine speichern
            </button>
            <button type="button" onClick={() => setOpened(null)} className="min-h-11 rounded-card border border-line px-4 text-sm text-mute hover:text-paper">
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
