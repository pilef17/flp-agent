import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatChf, formatDate } from "@/lib/format";
import { ORDER_STATUS_LABEL, isEntitlementActive } from "@/lib/commerce";
import { PageHeader, EmptyState, Badge } from "@/components/ui/Feedback";
import { Card, CardTitle, Stat } from "@/components/ui/Card";
import { ShopTabs } from "../produkte/ShopTabs";
import { GrantForm } from "./GrantForm";
import { revokeAccess } from "./actions";

export const metadata: Metadata = { title: "Bestellungen" };

type Status = keyof typeof ORDER_STATUS_LABEL;
const FILTERS: (Status | "alle")[] = ["alle", "paid", "pending", "refunded", "canceled", "failed"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; test?: string }> }) {
  await requireAdmin();
  const { status = "alle", test } = await searchParams;
  const showTest = test === "1";
  const supabase = await createClient();

  let q = supabase
    .from("orders")
    .select("id, status, total_cents, created_at, paid_at, is_test_data, failure_reason, profiles:user_id(full_name, email), order_items(title_snapshot)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "alle" && status in ORDER_STATUS_LABEL) q = q.eq("status", status);
  if (!showTest) q = q.eq("is_test_data", false);

  const [{ data: orders, error }, { data: ents }, { data: products }, { data: paid }] = await Promise.all([
    q,
    supabase
      .from("entitlements")
      .select("id, source, starts_at, ends_at, revoked_at, created_at, profiles:user_id(full_name, email), products(title)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("products").select("id, title").order("position"),
    supabase.from("orders").select("total_cents").eq("status", "paid").eq("is_test_data", false),
  ]);
  if (error) throw new Error(error.message);
  const revenue = (paid ?? []).reduce((n, o) => n + o.total_cents, 0);
  const active = (ents ?? []).filter((e) => isEntitlementActive(e));
  type Person = { full_name: string; email: string } | null;
  const filterHref = (s: string, t = showTest) => `/admin/bestellungen?status=${s}${t ? "&test=1" : ""}`;

  return (
    <>
      <PageHeader eyebrow="Shop" title="Bestellungen" text="Zahlungen werden ausschliesslich über den Stripe-Webhook bestätigt. Kartendaten liegen nur bei Stripe." />
      <ShopTabs active="bestellungen" />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Umsatz (bezahlt)" value={formatChf(revenue)} hint="ohne Testbestellungen, ohne Rückerstattungen" />
        <Stat label="Bezahlte Bestellungen" value={paid?.length ?? 0} />
        <Stat label="Aktive Zugänge" value={active.length} hint="Käufe und manuelle Freigaben" />
      </div>

      <Card>
        <CardTitle
          eyebrow="Verlauf"
          title="Bestellungen"
          action={
            <Link href={filterHref(status, !showTest)} className="text-sm text-mute hover:text-paper">
              {showTest ? "Testbestellungen ausblenden" : "Testbestellungen zeigen"}
            </Link>
          }
        />
        <nav aria-label="Status filtern" className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={filterHref(f)}
              aria-current={status === f ? "true" : undefined}
              className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-xs uppercase tracking-wider ${status === f ? "border-gold bg-gold text-ink" : "border-line text-mute hover:text-paper"}`}
            >
              {f === "alle" ? "Alle" : ORDER_STATUS_LABEL[f]}
            </Link>
          ))}
        </nav>
        {(orders ?? []).length === 0 ? (
          <EmptyState title="Keine Bestellungen" text="Sobald Kunden Programme kaufen, erscheinen die Bestellungen hier." />
        ) : (
          <ul className="divide-y divide-line">
            {orders!.map((o) => {
              const person = o.profiles as unknown as Person;
              return (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{person?.full_name || person?.email}</span>
                    <span className="block text-xs text-mute">
                      {(o.order_items as { title_snapshot: string }[]).map((i) => i.title_snapshot).join(", ")} · {formatDate(o.paid_at ?? o.created_at)} · Nr.{" "}
                      {o.id.slice(0, 8).toUpperCase()} · {person?.email}
                    </span>
                    {o.failure_reason && <span className="block text-xs text-danger">{o.failure_reason}</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums">{formatChf(o.total_cents)}</span>
                    {o.is_test_data && <Badge tone="danger">Test</Badge>}
                    <Badge tone={o.status === "paid" ? "ok" : o.status === "refunded" ? "gold" : "neutral"}>{ORDER_STATUS_LABEL[o.status as Status]}</Badge>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-5 text-xs text-mute">Rückerstattungen im Stripe-Dashboard auslösen – der Zugang wird danach automatisch entzogen.</p>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle eyebrow="Zugänge" title="Programmzugänge" />
          {(ents ?? []).length === 0 ? (
            <EmptyState title="Keine Zugänge" text="Gekaufte und manuell vergebene Zugänge erscheinen hier." />
          ) : (
            <ul className="divide-y divide-line">
              {ents!.map((e) => {
                const person = e.profiles as unknown as Person;
                const product = e.products as unknown as { title: string } | null;
                const isActive = isEntitlementActive(e);
                return (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <span>
                      <span className="font-medium">{product?.title}</span> · {person?.full_name || person?.email}
                      <span className="block text-xs text-mute">
                        {e.source === "purchase" ? "Kauf" : "Manuell"} · seit {formatDate(e.starts_at)}
                        {e.ends_at ? ` · bis ${formatDate(e.ends_at)}` : " · unbefristet"}
                      </span>
                    </span>
                    {isActive ? (
                      <form action={revokeAccess}>
                        <input type="hidden" name="entitlementId" value={e.id} />
                        <button type="submit" className="min-h-11 text-sm text-danger hover:underline">
                          Entziehen
                        </button>
                      </form>
                    ) : (
                      <Badge>{e.revoked_at ? "Entzogen" : "Abgelaufen"}</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card className="h-fit lg:col-span-2">
          <CardTitle eyebrow="Manuell" title="Zugang vergeben" />
          <GrantForm products={products ?? []} />
        </Card>
      </div>
    </>
  );
}
