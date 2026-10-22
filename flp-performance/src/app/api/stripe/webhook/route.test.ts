import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

vi.mock("server-only", () => ({}));
const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));

process.env.STRIPE_SECRET_KEY = "sk_test_unit";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_unit_test_secret";

const { POST } = await import("./route");
const stripe = new Stripe("sk_test_unit");

function signed(event: object, secret = "whsec_unit_test_secret") {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body: payload,
    headers: { "stripe-signature": header, "content-type": "application/json" },
  }) as unknown as Parameters<typeof POST>[0];
}

const ORDER = "6f1c2b9e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";
const session = (over: object = {}) => ({
  id: "evt_1",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_1",
      object: "checkout.session",
      payment_status: "paid",
      amount_total: 3900,
      currency: "chf",
      payment_intent: "pi_1",
      metadata: { order_id: ORDER },
      client_reference_id: ORDER,
      ...over,
    },
  },
});

describe("Stripe-Webhook", () => {
  beforeEach(() => rpc.mockReset());

  it("lehnt fehlende Signatur ab", async () => {
    const req = new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }) as unknown as Parameters<typeof POST>[0];
    expect((await POST(req)).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("lehnt falsche Signatur ab (kein Zugang ohne Stripe)", async () => {
    const res = await POST(signed(session(), "whsec_falsch"));
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("verbucht bezahlte Checkout-Session mit Betrag und Bestellung aus Stripe", async () => {
    rpc.mockResolvedValue({ data: "fulfilled", error: null });
    const res = await POST(signed(session()));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("fulfill_checkout", {
      p_event_id: "evt_1",
      p_event_type: "checkout.session.completed",
      p_order_id: ORDER,
      p_session_id: "cs_test_1",
      p_payment_intent: "pi_1",
      p_amount_total: 3900,
      p_currency: "chf",
    });
    expect(await res.json()).toMatchObject({ result: "fulfilled" });
  });

  it("vergibt keinen Zugang, solange die Zahlung aussteht", async () => {
    const res = await POST(signed(session({ payment_status: "unpaid" })));
    expect(res.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
    expect(await res.json()).toMatchObject({ result: "awaiting_payment" });
  });

  it("meldet Datenbankfehler mit 500, damit Stripe erneut zustellt", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "db down" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(signed(session()))).status).toBe(500);
  });

  it("storniert abgelaufene Sessions", async () => {
    rpc.mockResolvedValue({ data: "canceled", error: null });
    await POST(signed({ ...session(), id: "evt_2", type: "checkout.session.expired" }));
    expect(rpc).toHaveBeenCalledWith("update_order_from_stripe", expect.objectContaining({ p_status: "canceled", p_session_id: "cs_test_1" }));
  });

  it("entzieht Zugang nur bei vollständiger Rückerstattung", async () => {
    rpc.mockResolvedValue({ data: "refunded", error: null });
    const charge = (refunded: boolean) => ({
      id: "evt_3",
      type: "charge.refunded",
      data: { object: { id: "ch_1", object: "charge", refunded, payment_intent: "pi_1" } },
    });
    await POST(signed(charge(false)));
    expect(rpc).not.toHaveBeenCalled();
    await POST(signed(charge(true)));
    expect(rpc).toHaveBeenCalledWith("update_order_from_stripe", expect.objectContaining({ p_status: "refunded", p_payment_intent: "pi_1" }));
  });

  it("ignoriert unbekannte Events", async () => {
    const res = await POST(signed({ id: "evt_9", type: "customer.created", data: { object: {} } }));
    expect(res.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });
});
