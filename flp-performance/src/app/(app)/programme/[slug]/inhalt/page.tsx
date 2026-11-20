import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/data/media";
import { SLUG_PATTERN } from "@/lib/commerce";
import { PageHeader } from "@/components/ui/Feedback";
import { Card } from "@/components/ui/Card";
import { SessionView } from "@/components/programs/SessionView";
import { parseSessionData } from "@/lib/programs";

export const metadata: Metadata = { title: "Programm" };

const KIND_LABEL = { article: "Lektion", video: "Video", exercise: "Übung", session: "Einheit" } as const;

function SessionContent({ value }: { value: unknown }) {
  const data = parseSessionData(value);
  if (!data) return <p className="mt-3 text-sm text-mute">Diese Einheit kann gerade nicht angezeigt werden.</p>;
  return (
    <details className="group mt-2">
      <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-gold">
        <span className="group-open:hidden">Ablauf anzeigen</span>
        <span className="hidden group-open:inline">Ablauf ausblenden</span>
      </summary>
      <SessionView data={data} />
    </details>
  );
}

type Item = {
  id: string;
  kind: "exercise" | "article" | "video" | "session";
  title: string;
  body: string;
  exercise_id: string | null;
  storage_path: string | null;
  data: unknown;
  position: number;
  exercises: { code: string; title: string } | null;
};

export default async function ProgramContentPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireViewer();
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) notFound();
  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("id, title, slug").eq("slug", slug).maybeSingle();
  if (!product) notFound();

  // RLS liefert Inhalte nur mit gültigem Zugang
  const { data, error } = await supabase
    .from("product_content")
    .select("id, kind, title, body, exercise_id, storage_path, data, position, exercises(code, title)")
    .eq("product_id", product.id)
    .order("position");
  if (error) throw new Error(error.message);
  const items = (data ?? []) as unknown as Item[];
  if (items.length === 0) {
    const { count } = await supabase.from("entitlements").select("id", { count: "exact", head: true }).eq("product_id", product.id).is("revoked_at", null);
    if (!count) redirect(`/programme/${slug}`);
  }
  const urls = await signedUrls(
    supabase,
    "program-media",
    items.filter((i) => i.kind === "video" && i.storage_path).map((i) => i.storage_path!),
  );

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/meine-kaeufe" className="text-mute hover:text-paper">
          ← Meine Käufe
        </Link>
      </p>
      <PageHeader eyebrow="Mein Programm" title={product.title} />
      {items.length === 0 ? (
        <p className="text-mute">Die Inhalte werden gerade vorbereitet und erscheinen hier automatisch.</p>
      ) : (
        <ol className="max-w-3xl space-y-6">
          {items.map((it, i) => (
            <li key={it.id}>
              <Card>
                <p className="eyebrow mb-2">
                  {String(i + 1).padStart(2, "0")} · {KIND_LABEL[it.kind]}
                </p>
                <h2 className="text-2xl font-bold">{it.title}</h2>
                {it.kind === "video" && it.storage_path && (
                  urls[it.storage_path] ? (
                    <video src={urls[it.storage_path]} controls playsInline preload="metadata" controlsList="nodownload" className="mt-4 aspect-video w-full rounded-card bg-black" />
                  ) : (
                    <p className="mt-3 text-sm text-mute">Video derzeit nicht verfügbar.</p>
                  )
                )}
                {it.kind === "exercise" && it.exercise_id && (
                  <Link href={`/uebungen/${it.exercise_id}`} className="mt-4 inline-flex text-sm text-gold hover:underline">
                    {it.exercises?.code} · Übung mit Video öffnen →
                  </Link>
                )}
                {it.kind === "session" && <SessionContent value={it.data} />}
                {it.body && <p className="mt-4 whitespace-pre-line leading-relaxed text-mute">{it.body}</p>}
              </Card>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-10 max-w-3xl text-xs text-mute">
        Die Inhalte zur Ernährung sind allgemeine Bildungsinhalte und ersetzen keine individuelle medizinische oder ernährungsberaterische Beratung.
      </p>
    </>
  );
}
