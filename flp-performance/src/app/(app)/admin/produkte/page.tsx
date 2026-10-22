import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatChf } from "@/lib/format";
import { accessLabel } from "@/lib/commerce";
import { PageHeader, Badge } from "@/components/ui/Feedback";
import { Card, CardTitle } from "@/components/ui/Card";
import { ShopTabs } from "./ShopTabs";
import { ProductForm } from "./Forms";
import { createProduct } from "./actions";

export const metadata: Metadata = { title: "Produkte" };

export default async function AdminProductsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("id, slug, title, price_cents, access_days, is_active, position, product_content(id)")
    .order("position");
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader eyebrow="Shop" title="Produkte" text="Preise, Inhalte und Sichtbarkeit der digitalen Programme verwalten." />
      <ShopTabs active="produkte" />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle eyebrow="Katalog" title={`${products?.length ?? 0} Programme`} />
          <ul className="divide-y divide-line">
            {(products ?? []).map((p) => (
              <li key={p.id}>
                <Link href={`/admin/produkte/${p.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-gold">
                  <span>
                    <span className="font-medium">{p.title}</span>
                    <span className="block text-xs text-mute">
                      {formatChf(p.price_cents)} · {accessLabel(p.access_days)} · {p.product_content?.length ?? 0} Inhalte
                    </span>
                  </span>
                  {p.is_active ? <Badge tone="ok">Aktiv</Badge> : <Badge>Inaktiv</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="h-fit lg:col-span-2">
          <CardTitle eyebrow="Neu" title="Programm erstellen" />
          <ProductForm action={createProduct} submitLabel="Programm erstellen" />
        </Card>
      </div>
    </>
  );
}
