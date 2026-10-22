import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { centsToInput } from "@/lib/commerce";
import { PageHeader, Badge, Alert } from "@/components/ui/Feedback";
import { Card, CardTitle } from "@/components/ui/Card";
import { StorageUpload } from "@/components/ui/StorageUpload";
import { ProductCover } from "@/components/shop/ProductCover";
import { ArticleForm, ExerciseItemForm, ProductForm } from "../Forms";
import { deleteContentItem, moveContentItem, registerCover, registerProgramVideo, setProductActive, updateProduct } from "../actions";

export const metadata: Metadata = { title: "Programm bearbeiten" };

const KIND = { article: "Lektion", exercise: "Übung", video: "Video" } as const;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
// Bucket «program-media» erlaubt nur MP4 und WebM
const PROGRAM_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;

export default async function AdminProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erstellt?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { erstellt } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: p }, { data: exercises }, { count: buyers }] = await Promise.all([
    supabase
      .from("products")
      .select("*, product_content(id, kind, title, position, created_at)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("exercises").select("id, code, title").eq("status", "published").order("code"),
    supabase.from("entitlements").select("id", { count: "exact", head: true }).eq("product_id", id).is("revoked_at", null),
  ]);
  if (!p) notFound();
  const items = [...(p.product_content as { id: string; kind: keyof typeof KIND; title: string; position: number; created_at: string }[])].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
  );

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/admin/produkte" className="text-mute hover:text-paper">
          ← Alle Produkte
        </Link>
      </p>
      <PageHeader
        eyebrow={`Programm · /programme/${p.slug}`}
        title={p.title}
        text={`${buyers ?? 0} aktive Zugänge`}
        action={
          <form action={setProductActive} className="flex items-center gap-3">
            {p.is_active ? <Badge tone="ok">Im Shop sichtbar</Badge> : <Badge>Inaktiv</Badge>}
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="active" value={p.is_active ? "false" : "true"} />
            <button
              type="submit"
              className={`min-h-11 rounded-card border px-4 text-sm ${p.is_active ? "border-line text-mute hover:text-paper" : "border-gold bg-gold font-semibold text-ink hover:bg-gold-soft"}`}
            >
              {p.is_active ? "Deaktivieren" : "Im Shop aktivieren"}
            </button>
          </form>
        }
      />
      {erstellt && (
        <div className="mb-6">
          <Alert tone="success">Programm erstellt (inaktiv). Füge Inhalte und ein Titelbild hinzu und aktiviere es danach.</Alert>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle eyebrow="Angaben" title="Programm bearbeiten" />
          <ProductForm
            action={updateProduct.bind(null, p.id)}
            submitLabel="Speichern"
            defaults={{
              title: p.title,
              slug: p.slug,
              summary: p.summary,
              description: p.description,
              price: centsToInput(p.price_cents),
              accessDays: p.access_days ? String(p.access_days) : "",
              position: String(p.position),
            }}
          />
        </Card>
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle eyebrow="Titelbild" title="Bild" />
            <ProductCover path={p.cover_image_path} title={p.title} className="mb-4" />
            <StorageUpload
              bucket="product-covers"
              folderId={p.id}
              accept={IMAGE_TYPES}
              maxBytes={5 * 1024 * 1024}
              label={p.cover_image_path ? "Bild ersetzen" : "Bild hochladen"}
              hint="JPG, PNG oder WebP · max. 5 MB · öffentlich sichtbar · keine Kinderfotos ohne Einwilligung"
              register={registerCover.bind(null, p.id)}
            />
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardTitle eyebrow="Inhalte" title={`${items.length} Inhalte`} />
        {items.length > 0 && (
          <ol className="mb-8 space-y-2">
            {items.map((it, idx) => (
              <li key={it.id} className="flex items-center gap-3 rounded-card bg-ink px-3 py-2 text-sm">
                <span className="w-5 text-center text-xs text-mute">{idx + 1}</span>
                <span className="min-w-0 flex-1 truncate">
                  {it.title} <span className="ml-2 text-xs uppercase tracking-wider text-mute">{KIND[it.kind]}</span>
                </span>
                {(["up", "down"] as const).map((dir) => (
                  <form key={dir} action={moveContentItem}>
                    <input type="hidden" name="productId" value={p.id} />
                    <input type="hidden" name="itemId" value={it.id} />
                    <input type="hidden" name="direction" value={dir} />
                    <button
                      type="submit"
                      disabled={dir === "up" ? idx === 0 : idx === items.length - 1}
                      aria-label={dir === "up" ? "Nach oben" : "Nach unten"}
                      className="flex size-11 items-center justify-center text-mute hover:text-gold disabled:opacity-25"
                    >
                      {dir === "up" ? "↑" : "↓"}
                    </button>
                  </form>
                ))}
                <form action={deleteContentItem}>
                  <input type="hidden" name="productId" value={p.id} />
                  <input type="hidden" name="itemId" value={it.id} />
                  <button type="submit" aria-label="Entfernen" className="flex size-11 items-center justify-center text-mute hover:text-danger">
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ol>
        )}
        <div className="grid gap-8 lg:grid-cols-3">
          <div>
            <p className="eyebrow mb-4">Lektion (Text)</p>
            <ArticleForm productId={p.id} />
          </div>
          <div>
            <p className="eyebrow mb-4">Übung</p>
            <ExerciseItemForm productId={p.id} exercises={exercises ?? []} />
          </div>
          <div>
            <p className="eyebrow mb-4">Video</p>
            <StorageUpload
              bucket="program-media"
              folderId={p.id}
              accept={PROGRAM_VIDEO_TYPES}
              maxBytes={500 * 1024 * 1024}
              withTitle
              label="Video hochladen"
              hint="MP4 oder WebM · privat, nur für Käufer"
              register={registerProgramVideo.bind(null, p.id)}
            />
          </div>
        </div>
      </Card>
    </>
  );
}
