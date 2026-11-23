"use client";

import { useActionState } from "react";
import { addDays, todayInSwitzerland } from "@/lib/dates";
import { LOCATIONS, MAX_DAYS_AHEAD, REQUEST_STATUS, dayLabel, type RequestStatus } from "@/lib/training-requests";
import { requestTraining, withdrawRequest, type RequestState } from "./actions";

export type ParentRequest = {
  id: string;
  day: string;
  wish_times: string;
  location: string;
  note: string;
  status: RequestStatus;
  confirmed_time: string;
  coach_note: string;
};

const TONE = { neutral: "text-mute", ok: "text-ok", danger: "text-danger", gold: "text-gold" } as const;

/** Termine vorschlagen (Wunschzeit), Felipe bestätigt. Liste der kommenden Termine mit Status. */
export function TrainingRequests({ playerId, firstName, requests }: { playerId: string; firstName: string; requests: ParentRequest[] }) {
  const [state, action, pending] = useActionState<RequestState, FormData>(requestTraining, {});
  const today = todayInSwitzerland();
  const v = state.ok ? undefined : state.values;
  return (
    <div className="space-y-5">
      {requests.length > 0 && (
        <ul className="divide-y divide-line rounded-card border border-line" data-testid="requests">
          {requests.map((r) => {
            const s = REQUEST_STATUS[r.status];
            const time = r.status === "bestaetigt" || r.status === "erledigt" ? r.confirmed_time || r.wish_times : r.wish_times;
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-semibold tabular-nums">
                    {dayLabel(r.day)} · {time}
                    {r.location ? ` · ${r.location}` : ""}
                  </p>
                  {r.coach_note && <p className="text-xs text-mute">Felipe: «{r.coach_note}»</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${TONE[s.tone]}`}>
                    {s.icon} {s.label}
                  </span>
                  {r.status === "angefragt" && (
                    <form action={withdrawRequest}>
                      <input type="hidden" name="requestId" value={r.id} />
                      <button type="submit" className="min-h-11 text-sm text-mute underline underline-offset-4 hover:text-paper">
                        Zurückziehen
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form action={action} className="space-y-3 rounded-card border border-line p-4" noValidate>
        <p className="font-semibold">Termin vorschlagen</p>
        <p className="text-xs text-mute">Schlage Tag, Wunschzeit und Ort vor. Felipe bestätigt den Termin und meldet sich bei Änderungen.</p>
        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p role="status" className="text-sm text-ok">
            Danke! Die Anfrage ist bei Felipe.
          </p>
        )}
        <input type="hidden" name="playerId" value={playerId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-mute">Tag</span>
            <input
              type="date"
              name="day"
              required
              min={today}
              max={addDays(today, MAX_DAYS_AHEAD)}
              defaultValue={v?.day}
              aria-label={`Tag für ${firstName}`}
              className="mt-1 block min-h-11 w-full rounded-card border border-line bg-ink px-3 text-paper"
            />
          </label>
          <label className="block text-sm">
            <span className="text-mute">Wunschzeit</span>
            <input
              name="wishTimes"
              required
              maxLength={60}
              placeholder="z. B. 9:00 / 9:30"
              defaultValue={v?.wishTimes}
              className="mt-1 block min-h-11 w-full rounded-card border border-line bg-ink px-3 text-paper"
            />
          </label>
          <label className="block text-sm">
            <span className="text-mute">Ort</span>
            <select name="location" defaultValue={v?.location ?? ""} className="mt-1 block min-h-11 w-full rounded-card border border-line bg-ink px-3 text-paper">
              <option value="">Egal / nach Absprache</option>
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-mute">Bemerkung (optional)</span>
            <input
              name="note"
              maxLength={200}
              placeholder="z. B. mit Bruder"
              defaultValue={v?.note}
              className="mt-1 block min-h-11 w-full rounded-card border border-line bg-ink px-3 text-paper"
            />
          </label>
        </div>
        <button type="submit" disabled={pending} className="min-h-11 rounded-card bg-gold px-4 text-sm font-semibold text-ink hover:bg-gold-soft">
          {pending ? "Wird gesendet …" : "Termin anfragen"}
        </button>
      </form>
    </div>
  );
}
