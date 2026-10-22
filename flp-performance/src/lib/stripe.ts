import "server-only";
import Stripe from "stripe";
import { stripeEnv } from "@/lib/env";

let client: Stripe | null = null;

/** Stripe-Client (nur serverseitig). Kartendaten berühren nie unseren Server. */
export function getStripe(): Stripe {
  if (client) return client;
  const base = stripeEnv.apiBase();
  const url = base ? new URL(base) : null;
  client = new Stripe(stripeEnv.secretKey(), {
    maxNetworkRetries: 2,
    ...(url
      ? { host: url.hostname, port: url.port, protocol: url.protocol.replace(":", "") as "http" | "https" }
      : {}),
  });
  return client;
}
