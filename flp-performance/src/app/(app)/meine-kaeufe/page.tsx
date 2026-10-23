import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatChf, formatDate } from "@/lib/format";
import { ORDER_STATUS_LABEL, isEntitlementActive } from "@/lib/commerce";
import { PageHeader, EmptyState, Badge, Alert } from "@/components/ui/Feedback";
import { Card, CardTitle } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Meine Käufe" };

type Order = {
  id: string;
  status: keyof typeof ORDER_STATUS_LABEL;
  total_cents: number;
  created_at: string;
  paid_at: string | null;
  is_test_data: boolean;
  order_items: { title_snapshot: string }[];
};

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ bestellung?: string }> }) {
  const viewer = await requireViewer();
  const { bestellung } = await searchParams;
  const supabase = await createClient();
  const [{ data: orders, error }, { data: ents }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, total_cents, created_at, paid_at, is_test_data, order_items(title_snapshot)")
      .eq("user_id", viewer.id)
      .neq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("entitlements")
      .select("id, starts_at, ends_at, revoked_at, source, products(slug, title)")
      .eq("user_id", viewer.id)
      .order("created_at", { ascending: false }),
  ]);
  if (error) throw new Error(error.message);

  // Rückkehr von Stripe: Status der gerade bezahlten Bestellung
  let justPaid: Order["status"] | null = null;
  if (bestellung && /^[0-9a-f-]{36}$/i.test(bestellung)) {
    const { data } = await supabase.from("orders").select("status").eq("id", bestellung).maybeSingle();
    justPaid = (data?.status as Order["status"]) ?? null;
  }
  const active = (ents ?? []).filter((e) => isEntitlementActive(e));
  type Product = { slug: string; title: string } | null;

  return (
    <>
      <PageHeader eyebrow="Konto" title="Meine Käufe" action={<Link href="/programme" className="text-sm text-gold hover:underline">Programme ansehen →</Link>} />

      {justPaid === "paid" && (
        <div className="mb-6">
          <Alert tone="success">Danke für deinen Kauf! Dein Programm ist freigeschaltet.</Alert>
        </div>
      )}
      {justPaid === "pending" && (
        <div className="mb-6">
          <Alert tone="info">
            Wir warten noch auf die Bestätigung der Zahlung durch Stripe. Das dauert meist nur Sekunden.{" "}
            <Link href={`/meine-kaeufe?bestellung=${bestellung}`} className="underline">
              Aktualisieren
            </Link>
          </Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle eyebrow="Zugang" title="Meine Programme" />
          {active.length === 0 ? (
            <EmptyState title="Noch keine Programme" text="Gekaufte Programme erscheinen hier, sobald die Zahlung bestätigt ist." action={<ButtonLink href="/programme">Programme entdecken</ButtonLink>} />
          ) : (
            <ul className="divide-y divide-line">
              {active.map((e) => {
                const p = e.products as unknown as Product;
                return (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                    <span>
                      <span className="font-medium">{p?.title}</span>
                      <span className="block text-xs text-mute">{e.ends_at ? `Zugang bis ${formatDate(e.ends_at)}` : "Unbefristeter Zugang"}</span>
                    </span>
                    <ButtonLink href={`/programme/${p?.slug}/inhalt`} variant="secondary">
                      Öffnen
                    </ButtonLink>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle eyebrow="Verlauf" title="Bestellungen" />
          {(orders ?? []).length === 0 ? (
            <EmptyState title="Keine Bestellungen" text="Hier siehst du alle Käufe mit Datum und Betrag." />
          ) : (
            <ul className="divide-y divide-line">
              {(orders as Order[]).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span>
                    <span className="font-medium">{o.order_items.map((i) => i.title_snapshot).join(", ")}</span>
                    <span className="block text-xs text-mute">
                      {formatDate(o.paid_at ?? o.created_at)} · {formatChf(o.total_cents)} · Nr. {o.id.slice(0, 8).toUpperCase()}
                    </span>
                  </span>
                  <span className="flex gap-2">
                    {o.is_test_data && <Badge tone="danger">Test</Badge>}
                    <Badge tone={o.status === "paid" ? "ok" : o.status === "refunded" ? "gold" : "neutral"}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 text-xs text-mute">Die Zahlungsquittung erhältst du per E-Mail von Stripe.</p>
        </Card>
      </div>
    </>
  );
}
