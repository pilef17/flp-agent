import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { stripeEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe-Webhook. Zugang wird ausschliesslich hier vergeben – nach geprüfter
 * Signatur und bestätigter Zahlung. Die Verbuchung ist atomar und idempotent
 * (Datenbankfunktionen fulfill_checkout / update_order_from_stripe).
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signatur fehlt" }, { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, stripeEnv.webhookSecret());
  } catch {
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 });
  }

  const db = createAdminClient();
  let result: string;

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      // Bei verzögerten Zahlarten folgt später async_payment_succeeded
      if (session.payment_status !== "paid") {
        result = "awaiting_payment";
        break;
      }
      const orderId = session.metadata?.order_id ?? session.client_reference_id;
      if (!orderId) {
        result = "no_order";
        break;
      }
      const { data, error } = await db.rpc("fulfill_checkout", {
        p_event_id: event.id,
        p_event_type: event.type,
        p_order_id: orderId,
        p_session_id: session.id,
        p_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
        p_amount_total: session.amount_total ?? -1,
        p_currency: session.currency ?? "",
      });
      if (error) return retryLater(error.message);
      result = data as string;
      break;
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { data, error } = await db.rpc("update_order_from_stripe", {
        p_event_id: event.id,
        p_event_type: event.type,
        p_session_id: session.id,
        p_payment_intent: null,
        p_status: event.type === "checkout.session.expired" ? "canceled" : "failed",
      });
      if (error) return retryLater(error.message);
      result = data as string;
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      // Nur vollständige Rückerstattungen entziehen den Zugang
      if (!charge.refunded || !charge.payment_intent) {
        result = "partial_refund_ignored";
        break;
      }
      const { data, error } = await db.rpc("update_order_from_stripe", {
        p_event_id: event.id,
        p_event_type: event.type,
        p_session_id: null,
        p_payment_intent: typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent.id,
        p_status: "refunded",
      });
      if (error) return retryLater(error.message);
      result = data as string;
      break;
    }
    default:
      result = "ignored";
  }

  return NextResponse.json({ received: true, result });
}

function retryLater(message: string) {
  // 500 → Stripe wiederholt die Zustellung automatisch
  console.error("Stripe-Webhook fehlgeschlagen:", message);
  return NextResponse.json({ error: "Verarbeitung fehlgeschlagen" }, { status: 500 });
}
