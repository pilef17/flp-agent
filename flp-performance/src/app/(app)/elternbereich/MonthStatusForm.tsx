"use client";

import { useActionState, useState } from "react";
import { PAUSE_REASONS, monthLabel, statusLabel, type PauseReason } from "@/lib/month-status";
import { setMonthStatus, type MonthStatusState } from "./actions";

type Status = { active: boolean; reason: string; note: string } | null;

/** Ein Monat: Status anzeigen und als Aktiv oder Pausiert melden. */
export function MonthStatusForm({ playerId, firstName, month, status }: { playerId: string; firstName: string; month: string; status: Status }) {
  const [state, action, pending] = useActionState<MonthStatusState, FormData>(setMonthStatus, {});
  // Das Pause-Formular gilt nur für den Stand, in dem es geöffnet wurde: nach dem Senden schliesst es sich.
  const [openedFor, setOpenedFor] = useState<MonthStatusState | null>(null);
  const pausing = openedFor === state;
  const label = monthLabel(month);
  const tone = !status ? "text-mute" : status.active ? "text-ok" : "text-gold";
  return (
    <div className="rounded-card border border-line p-4" data-testid={`month-${month.slice(0, 7)}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{label}</p>
        <p className={`text-sm font-semibold ${tone}`}>{statusLabel(status)}</p>
      </div>
      {status?.note && <p className="mt-1 text-xs text-mute">«{status.note}»</p>}
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {!pausing ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={action}>
            <input type="hidden" name="playerId" value={playerId} />
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="active" value="true" />
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
            onClick={() => setOpenedFor(state)}
            aria-label={`${firstName} pausiert im ${label}`}
            className={`min-h-11 rounded-card border px-4 text-sm ${status && !status.active ? "border-gold text-gold" : "border-line hover:border-gold"}`}
          >
            ⏸️ Pausiert
          </button>
        </div>
      ) : (
        <form action={action} className="mt-3 space-y-3">
          <input type="hidden" name="playerId" value={playerId} />
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="active" value="false" />
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
            <input
              name="note"
              maxLength={200}
              defaultValue={status?.note ?? ""}
              className="mt-1 block min-h-11 w-full rounded-card border border-line bg-ink px-3 text-paper"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="min-h-11 rounded-card bg-gold px-4 text-sm font-semibold text-ink hover:bg-gold-soft">
              Pause melden
            </button>
            <button type="button" onClick={() => setOpenedFor(null)} className="min-h-11 rounded-card border border-line px-4 text-sm text-mute hover:text-paper">
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
