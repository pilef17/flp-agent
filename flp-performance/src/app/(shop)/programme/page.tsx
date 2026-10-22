import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatChf } from "@/lib/format";
import { accessLabel, isEntitlementActive } from "@/lib/commerce";
import { PageHeader, EmptyState, Badge } from "@/components/ui/Feedback";
import { ProductCover } from "@/components/shop/ProductCover";

export const metadata: Metadata = { title: "Programme" };

export default async function ProgramsPage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const [{ data: products, error }, { data: ents }] = await Promise.all([
    supabase.from("products").select("id, slug, title, summary, price_cents, access_days, cover_image_path").eq("is_active", true).order("position"),
    viewer ? supabase.from("entitlements").select("product_id, starts_at, ends_at, revoked_at").eq("user_id", viewer.id) : Promise.resolve({ data: [] }),
  ]);
  if (error) throw new Error(error.message);
  const owned = new Set((ents ?? []).filter((e) => isEntitlementActive(e)).map((e) => e.product_id));

  return (
    <>
      <PageHeader
        eyebrow="Digitale Programme"
        title="Programme"
        text="Trainiere nicht einfach mehr. Trainiere besser. Digitale Programme für zuhause – unabhängig vom Einzeltraining."
        action={
          viewer ? (
            <Link href="/meine-kaeufe" className="text-sm text-gold hover:underline">
              Meine Käufe →
            </Link>
          ) : undefined
        }
      />
      {(products ?? []).length === 0 ? (
        <EmptyState title="Bald verfügbar" text="Die ersten digitalen Programme werden gerade vorbereitet." />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products!.map((p) => (
            <li key={p.id}>
              <Link href={`/programme/${p.slug}`} className="group flex h-full flex-col rounded-card border border-line bg-graphite p-4 transition-colors hover:border-gold">
                <ProductCover path={p.cover_image_path} title={p.title} />
                <div className="flex flex-1 flex-col px-1 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-2xl font-bold group-hover:text-gold">{p.title}</h2>
                    {owned.has(p.id) && <Badge tone="ok">Freigeschaltet</Badge>}
                  </div>
                  {p.summary && <p className="mt-2 text-sm text-mute">{p.summary}</p>}
                  <p className="mt-auto flex items-baseline justify-between pt-5">
                    <span className="font-display text-2xl font-bold">{formatChf(p.price_cents)}</span>
                    <span className="text-xs text-mute">{accessLabel(p.access_days)}</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
