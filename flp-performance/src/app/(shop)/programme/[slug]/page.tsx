import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatChf } from "@/lib/format";
import { SLUG_PATTERN, accessLabel, isEntitlementActive } from "@/lib/commerce";
import { Alert, Badge } from "@/components/ui/Feedback";
import { ButtonLink } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ProductCover } from "@/components/shop/ProductCover";
import { startCheckout } from "../actions";

export const metadata: Metadata = { title: "Programm-Details" };

const KIND_LABEL = { exercise: "Übung", article: "Lektion", video: "Video" } as const;

export default async function ProgramDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ abgebrochen?: string; fehler?: string }>;
}) {
  const { slug } = await params;
  const { abgebrochen, fehler } = await searchParams;
  if (!SLUG_PATTERN.test(slug)) notFound();
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("products")
    .select("id, slug, title, summary, description, price_cents, access_days, cover_image_path")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!p) notFound();

  const [{ data: outline }, { data: ents }] = await Promise.all([
    supabase.rpc("product_outline", { prod: p.id }),
    viewer
      ? supabase.from("entitlements").select("starts_at, ends_at, revoked_at").eq("user_id", viewer.id).eq("product_id", p.id)
      : Promise.resolve({ data: [] }),
  ]);
  const owned = (ents ?? []).some((e) => isEntitlementActive(e));
  const items = (outline ?? []) as { kind: keyof typeof KIND_LABEL; title: string }[];

  return (
    <>
      <p className="mb-6 text-sm">
        <Link href="/programme" className="text-mute hover:text-paper">
          ← Alle Programme
        </Link>
      </p>
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductCover path={p.cover_image_path} title={p.title} />
        <div>
          <p className="eyebrow mb-3">Digitales Programm</p>
          <h1 className="text-5xl font-extrabold">{p.title}</h1>
          {p.summary && <p className="mt-4 text-lg text-mute">{p.summary}</p>}
          <p className="mt-8 flex items-baseline gap-4">
            <span className="font-display text-4xl font-bold">{formatChf(p.price_cents)}</span>
            <span className="text-sm text-mute">{accessLabel(p.access_days)}</span>
          </p>

          <div className="mt-8 space-y-4">
            {abgebrochen && <Alert tone="info">Die Zahlung wurde abgebrochen. Es wurde nichts belastet.</Alert>}
            {fehler && <Alert tone="error">Die Zahlung konnte nicht gestartet werden. Bitte versuche es später erneut.</Alert>}
            {owned ? (
              <div className="flex flex-wrap items-center gap-4">
                <Badge tone="ok">Freigeschaltet</Badge>
                <ButtonLink href={`/programme/${p.slug}/inhalt`}>Zum Programm</ButtonLink>
              </div>
            ) : viewer ? (
              <form action={startCheckout}>
                <input type="hidden" name="productId" value={p.id} />
                <SubmitButton className="w-full sm:w-auto" pendingLabel="Weiterleitung zu Stripe …">
                  Jetzt kaufen – {formatChf(p.price_cents)}
                </SubmitButton>
              </form>
            ) : (
              <ButtonLink href={`/login?next=${encodeURIComponent(`/programme/${p.slug}`)}`}>Anmelden und kaufen</ButtonLink>
            )}
            {!owned && (
              <p className="text-xs text-mute">
                Sichere Zahlung über Stripe. Kartendaten werden nicht bei FLP Performance gespeichert. Zugang sofort nach bestätigter Zahlung. Mit dem Kauf akzeptierst du die{" "}
                <Link href="/agb" className="underline underline-offset-4 hover:text-paper">
                  AGB
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        {p.description && (
          <section>
            <p className="eyebrow mb-4">Beschreibung</p>
            <p className="whitespace-pre-line leading-relaxed text-mute">{p.description}</p>
          </section>
        )}
        <section>
          <p className="eyebrow mb-4">Enthalten</p>
          {items.length === 0 ? (
            <p className="text-sm text-mute">Die Inhalte werden laufend ergänzt.</p>
          ) : (
            <ul className="divide-y divide-line rounded-card border border-line">
              {items.map((it, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>{it.title}</span>
                  <span className="text-xs uppercase tracking-wider text-mute">{KIND_LABEL[it.kind]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
