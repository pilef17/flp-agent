import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { PageHeader, Badge } from "@/components/ui/Feedback";
import { Card } from "@/components/ui/Card";
import { FeedbackForm } from "../FeedbackForm";
import { deleteFeedbackDraft, updateFeedback } from "../actions";

export const metadata: Metadata = { title: "Feedback bearbeiten" };

export default async function FeedbackEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: f } = await supabase
    .from("coach_feedback")
    .select("id, title, body, status, published_at, created_at, players(id, first_name, last_name)")
    .eq("id", id)
    .maybeSingle();
  if (!f) notFound();
  const player = f.players as unknown as { id: string; first_name: string; last_name: string };
  const published = f.status === "published";

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href={`/admin/spieler/${player.id}`} className="text-mute hover:text-paper">
          ← {player.first_name} {player.last_name}
        </Link>
      </p>
      <PageHeader
        eyebrow={`Trainer-Feedback · ${formatDate(f.published_at ?? f.created_at)}`}
        title={f.title}
        action={published ? <Badge tone="ok">Veröffentlicht</Badge> : <Badge tone="danger">Entwurf</Badge>}
      />
      <Card className="max-w-3xl">
        <FeedbackForm
          action={updateFeedback.bind(null, f.id)}
          defaults={{ title: f.title, body: f.body }}
          publishLabel={published ? "Speichern" : "Veröffentlichen"}
        />
      </Card>
      {!published && (
        <form action={deleteFeedbackDraft} className="mt-8">
          <input type="hidden" name="feedbackId" value={f.id} />
          <button type="submit" className="min-h-11 text-sm text-danger hover:underline">
            Entwurf löschen
          </button>
        </form>
      )}
    </>
  );
}
