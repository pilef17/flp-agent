// Erzeugt anon- und service-Schlüssel (HS256) für den lokalen Test-Stack.
import crypto from "node:crypto";
const secret = process.argv[2];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const sign = (payload) => {
  const h = b64({ alg: "HS256", typ: "JWT" });
  const p = b64(payload);
  return `${h}.${p}.${crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`;
};
const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
console.log(`E2E_ANON_KEY=${sign({ role: "anon", iss: "supabase", exp })}`);
console.log(`E2E_SERVICE_KEY=${sign({ role: "service_role", iss: "supabase", exp })}`);
