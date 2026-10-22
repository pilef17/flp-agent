import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { PageHeader, EmptyState, Badge } from "@/components/ui/Feedback";
import { Card } from "@/components/ui/Card";
import { updatePrivacyRequest } from "./actions";

export const metadata: Metadata = { title: "Datenschutz-Anträge" };

const TYPE_LABEL = { export: "Auskunft / Datenkopie", correction: "Berichtigung", deletion: "Löschung" } as const;

export default async function PrivacyAdminPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: requests, error } = await supabase
    .from("privacy_requests")
    .select("id, request_type, details, status, resolution_note, created_at, profiles:requester_id(full_name, email), players(first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader
        eyebrow="Administrator"
        title="Datenschutz-Anträge"
        text="Auskunfts-, Berichtigungs- und Löschbegehren. Bitte innert 30 Tagen bearbeiten und die Identität der antragstellenden Person prüfen."
      />
      {(requests ?? []).length === 0 ? (
        <EmptyState title="Keine Anträge" text="Aktuell liegen keine Datenschutz-Anträge vor." />
      ) : (
        <div className="space-y-4">
          {requests!.map((r) => {
            const requester = r.profiles as unknown as { full_name: string; email: string } | null;
            const player = r.players as unknown as { first_name: string; last_name: string } | null;
            return (
              <Card key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">{TYPE_LABEL[r.request_type as keyof typeof TYPE_LABEL]}</p>
                    <p className="mt-1 font-semibold">
                      {requester?.full_name || requester?.email} {player ? `– betrifft ${player.first_name} ${player.last_name}` : "– eigenes Konto"}
                    </p>
                    <p className="text-xs text-mute">
                      Eingegangen am {formatDate(r.created_at)} · {requester?.email}
                    </p>
                    {r.details && <p className="mt-3 whitespace-pre-line text-sm text-mute">{r.details}</p>}
                  </div>
                  <Badge tone={r.status === "completed" ? "ok" : r.status === "rejected" ? "danger" : "gold"}>{r.status}</Badge>
                </div>
                <form action={updatePrivacyRequest} className="mt-5 grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
                  <input type="hidden" name="requestId" value={r.id} />
                  <label className="text-xs uppercase tracking-wider text-mute">
                    Status
                    <select name="status" defaultValue={r.status} className="field mt-1.5">
                      <option value="open">Offen</option>
                      <option value="in_progress">In Bearbeitung</option>
                      <option value="completed">Erledigt</option>
                      <option value="rejected">Abgelehnt</option>
                    </select>
                  </label>
                  <label className="text-xs uppercase tracking-wider text-mute">
                    Notiz an antragstellende Person
                    <input name="resolutionNote" defaultValue={r.resolution_note} maxLength={2000} className="field mt-1.5" />
                  </label>
                  <button type="submit" className="min-h-11 rounded-card bg-gold px-5 text-sm font-semibold text-ink hover:bg-gold-soft">
                    Speichern
                  </button>
                </form>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
