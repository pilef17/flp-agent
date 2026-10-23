"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { publicEnv, stripeEnv } from "@/lib/env";
import { isEntitlementActive } from "@/lib/commerce";

const schema = z.object({ productId: z.guid() });

/**
 * Startet Stripe Checkout. Preis und Produkt kommen ausschliesslich aus der
 * Datenbank; der Zugang wird erst durch den Webhook nach bestätigter Zahlung vergeben.
 */
export async function startCheckout(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/programme");
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, slug, title, summary, price_cents, currency")
    .eq("id", parsed.data.productId)
    .eq("is_active", true)
    .maybeSingle();
  if (!product) redirect("/programme");

  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(`/programme/${product.slug}`)}`);

  const { data: owned } = await supabase
    .from("entitlements")
    .select("starts_at, ends_at, revoked_at")
    .eq("user_id", viewer.id)
    .eq("product_id", product.id);
  if ((owned ?? []).some((e) => isEntitlementActive(e))) redirect(`/programme/${product.slug}/inhalt`);

  const admin = createAdminClient();
  const { data: orderId, error } = await admin.rpc("create_pending_order", { p_user: viewer.id, p_product: product.id });
  if (error || !orderId) redirect(`/programme/${product.slug}?fehler=checkout`);

  const site = publicEnv.siteUrl();
  let url: string | null = null;
  try {
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        locale: "de",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: product.currency.toLowerCase(),
              unit_amount: product.price_cents,
              product_data: { name: product.title, ...(product.summary ? { description: product.summary } : {}) },
            },
          },
        ],
        ...(viewer.email ? { customer_email: viewer.email } : {}),
        client_reference_id: orderId as string,
        metadata: { order_id: orderId as string },
        payment_intent_data: { metadata: { order_id: orderId as string } },
        success_url: `${site}/meine-kaeufe?bestellung=${orderId}`,
        cancel_url: `${site}/programme/${product.slug}?abgebrochen=1`,
      },
      { idempotencyKey: `checkout-${orderId}` },
    );
    await admin
      .from("orders")
      .update({
        stripe_checkout_session_id: session.id,
        // Bestellungen aus dem Stripe-Testmodus sind als Testdaten markiert
        is_test_data: stripeEnv.secretKey().startsWith("sk_test_") || stripeEnv.apiBase() !== null,
      })
      .eq("id", orderId as string);
    url = session.url;
  } catch (e) {
    console.error("Stripe Checkout fehlgeschlagen:", e instanceof Error ? e.message : e);
    await admin.from("orders").update({ status: "failed", failure_reason: "Checkout konnte nicht gestartet werden" }).eq("id", orderId as string);
  }
  redirect(url ?? `/programme/${product.slug}?fehler=checkout`);
}
