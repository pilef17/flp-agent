import { runSuite } from "../lib.mjs";
import Stripe from "stripe";

const suite = () =>
  runSuite("Phase 4 · Shop, Stripe, Zugänge", async ({ BASE, PW, OUT, ctx, register, login, check, seen, sql, mailLink }) => {
    const stripeSig = new Stripe("sk_test_e2e");
    const WH_SECRET = "whsec_e2e_local_secret";
    async function webhook(event, secret = WH_SECRET) {
      const payload = JSON.stringify(event);
      const header = stripeSig.webhooks.generateTestHeaderString({ payload, secret });
      const r = await fetch(`${BASE}/api/stripe/webhook`, { method: "POST", body: payload, headers: { "stripe-signature": header, "content-type": "application/json" } });
      return { status: r.status, body: await r.json().catch(() => ({})) };
    }

    // Setup
    const admin = await ctx();
    await register(admin, "Felipe Admin", "admin@flp.test");
    sql(`update public.user_roles set role='admin' where user_id=(select id from auth.users where email='admin@flp.test');`);
    const parent = await ctx(true);
    await register(parent, "Anna Kundin", "kundin@flp.test");
    const other = await ctx();
    await register(other, "Beat Zweit", "zweit@flp.test");
    sql(`insert into public.exercises (code, title, category, status) values ('TEC-001', 'Ballführung im Slalom', 'technik', 'published');`);

    // 1. Admin: Produkt bearbeiten, Inhalte, aktivieren
    await admin.goto(`${BASE}/admin/produkte`);
    check(await seen(admin.getByText("3 Programme")), "Admin: drei Programmkonzepte vorhanden");
    check((await admin.getByText("Inaktiv", { exact: true }).count()) === 3, "Alle Konzepte zunächst inaktiv");
    await admin.getByRole("link", { name: /FLP Training/ }).click();
    await admin.waitForURL(/\/admin\/produkte\/[0-9a-f-]{36}/);
    const productUrl = admin.url();
    await admin.fill("#f-price", "abc");
    await admin.getByRole("button", { name: "Speichern" }).click();
    check(await seen(admin.getByText("Bitte einen gültigen Betrag eingeben")), "Ungültiger Preis abgelehnt");
    await admin.fill("#f-price", "0.50");
    await admin.getByRole("button", { name: "Speichern" }).click();
    check(await seen(admin.getByText("Mindestpreis CHF 1.00.")), "Mindestpreis geprüft");
    await admin.fill("#f-price", "42,50");
    await admin.fill("#f-accessDays", "365");
    await admin.getByRole("button", { name: "Speichern" }).click();
    check(await seen(admin.getByText("Gespeichert. Bereits bezahlte")), "Preis konfigurierbar (42,50)");
    check(sql(`select price_cents from public.products where slug='flp-training'`) === "4250", "Preis in Rappen gespeichert");
    await admin.fill("#article-title", "Lektion 1: Ballgefühl");
    await admin.fill("#article-body", "Jeden Tag 10 Minuten mit dem Ball.");
    await admin.getByRole("button", { name: "Lektion hinzufügen" }).click();
    await admin.getByText("Lektion 1: Ballgefühl").first().waitFor();
    await admin.selectOption("#content-exercise", { label: "TEC-001 · Ballführung im Slalom" });
    await admin.getByRole("button", { name: "Übung hinzufügen" }).click();
    check(await seen(admin.getByText("2 Inhalte")), "Inhalte hinzugefügt (Lektion + Übung)");
    await admin.getByRole("button", { name: "Im Shop aktivieren" }).click();
    check(await seen(admin.getByText("Im Shop sichtbar")), "Produkt aktiviert");
    // Neues Produkt
    await admin.goto(`${BASE}/admin/produkte`);
    await admin.fill("#f-title", "FLP Torhüter");
    await admin.fill("#f-price", "29");
    await admin.getByRole("button", { name: "Programm erstellen" }).click();
    await admin.waitForURL(/\/admin\/produkte\/[0-9a-f-]{36}\?erstellt=1/);
    check(await seen(admin.getByText("/programme/flp-torhueter")), "Neues Produkt mit automatischem Slug");

    // 2. Anonym: Katalog
    const anon = await ctx(true);
    await anon.goto(`${BASE}/programme`);
    check(await seen(anon.getByRole("heading", { name: "FLP Training" })), "Katalog öffentlich sichtbar");
    check((await anon.getByText("FLP Torhüter").count()) === 0 && (await anon.getByText("FLP Nutrition").count()) === 0, "Inaktive Produkte unsichtbar");
    check(await seen(anon.getByText("CHF 42.50")), "Preis im Katalog");
    await anon.getByRole("heading", { name: "FLP Training" }).click();
    await anon.waitForURL("**/programme/flp-training");
    check(await seen(anon.getByText("Lektion 1: Ballgefühl")), "Inhaltsübersicht (nur Titel) öffentlich");
    check((await anon.getByText("Jeden Tag 10 Minuten").count()) === 0, "Inhalt selbst nicht öffentlich");
    check(await seen(anon.getByRole("link", { name: "Anmelden und kaufen" })), "Kauf erfordert Login");
    await anon.goto(`${BASE}/programme/flp-training/inhalt`);
    check(anon.url().includes("/login"), "Programminhalt ohne Login gesperrt");

    // 3. Kauf über Stripe Checkout (stripe-mock)
    await parent.route("https://checkout.stripe.com/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<h1>Stripe Checkout (Test)</h1>" }));
    await parent.goto(`${BASE}/programme/flp-training`);
    await parent.getByRole("button", { name: /Jetzt kaufen – CHF 42.50/ }).click();
    await parent.waitForURL("https://checkout.stripe.com/**");
    check(true, "Weiterleitung zu Stripe Checkout");
    const [orderId, sessionId, oStatus, oTest, oTotal] = sql(`select id, stripe_checkout_session_id, status, is_test_data, total_cents from public.orders`).split("|");
    check(oStatus === "pending" && sessionId.startsWith("cs_") && oTest === "t" && oTotal === "4250", "Bestellung offen, Session gespeichert, als Test markiert, Preis aus DB");
    await parent.goto(`${BASE}/meine-kaeufe?bestellung=${orderId}`);
    check(await seen(parent.getByText("Wir warten noch auf die Bestätigung")), "Vor Webhook: wartet auf Bestätigung");
    await parent.goto(`${BASE}/programme/flp-training/inhalt`);
    check(await parent.waitForURL("**/programme/flp-training", { timeout: 10000 }).then(() => true).catch(() => false), "Vor Webhook: kein Zugang zum Inhalt");

    // 4. Webhook
    const evt = (id, over = {}) => ({
      id, type: "checkout.session.completed",
      data: { object: { id: sessionId, object: "checkout.session", payment_status: "paid", amount_total: 4250, currency: "chf", payment_intent: "pi_e2e", metadata: { order_id: orderId }, client_reference_id: orderId, ...over } },
    });
    check((await webhook(evt("evt_bad"), "whsec_falsch")).status === 400, "Webhook mit falscher Signatur: 400");
    check((await webhook(evt("evt_cheap", { amount_total: 100 }))).body.result === "mismatch", "Manipulierter Betrag wird nicht verbucht");
    check(sql(`select count(*) from public.entitlements`) === "0", "Kein Zugang nach Betragsabweichung");
    check((await webhook(evt("evt_ok"))).body.result === "fulfilled", "Echte Zahlung verbucht");
    check((await webhook(evt("evt_ok"))).body.result === "duplicate", "Wiederholte Zustellung idempotent");
    check(sql(`select count(*) from public.entitlements`) === "1", "Genau ein Zugang");

    await parent.goto(`${BASE}/meine-kaeufe?bestellung=${orderId}`);
    check(await seen(parent.getByText("Danke für deinen Kauf!")), "Danke-Meldung nach Zahlung");
    check(await seen(parent.getByText(/Zugang bis/)), "Zugang mit Ablaufdatum (365 Tage)");
    check(await seen(parent.getByText("Bezahlt", { exact: true })) && await seen(parent.getByText("Test", { exact: true })), "Bestellung bezahlt und als Test markiert");
    await parent.screenshot({ path: `${OUT}/p4_kaeufe_mobile.png`, fullPage: true });
    await parent.getByRole("link", { name: "Öffnen" }).click();
    await parent.waitForURL("**/programme/flp-training/inhalt");
    check(await seen(parent.getByText("Jeden Tag 10 Minuten mit dem Ball.")), "Gekaufter Inhalt sichtbar");
    check(await seen(parent.getByRole("link", { name: /TEC-001 · Übung mit Video öffnen/ })), "Übung im Programm verlinkt");
    await parent.getByRole("link", { name: /TEC-001/ }).click();
    check(await seen(parent.getByRole("heading", { name: "Ballführung im Slalom" })), "Übung über Kauf zugänglich (RLS)");
    await parent.goto(`${BASE}/programme`);
    check(await seen(parent.getByText("Freigeschaltet")), "Katalog zeigt «Freigeschaltet»");
    await parent.goto(`${BASE}/programme/flp-training`);
    check(await seen(parent.getByRole("link", { name: "Zum Programm" })), "Detailseite: kein zweiter Kauf, Link zum Programm");

    // 5. Admin: Bestellungen & manuelle Zugänge
    await admin.goto(`${BASE}/admin/bestellungen`);
    check(await seen(admin.getByText("Keine Bestellungen")), "Testbestellungen standardmässig ausgeblendet");
    await admin.getByRole("link", { name: "Testbestellungen zeigen" }).click();
    check(await seen(admin.getByText("Anna Kundin")), "Testbestellung einblendbar");
    await admin.fill("#grant-email", "unbekannt@flp.test");
    await admin.selectOption("#grant-product", { label: "FLP Training" });
    await admin.getByRole("button", { name: "Zugang vergeben" }).click();
    check(await seen(admin.getByText("Kein Konto mit dieser E-Mail")), "Manuelle Freigabe: unbekannte E-Mail abgelehnt");
    await admin.fill("#grant-email", "zweit@flp.test");
    await admin.selectOption("#grant-product", { label: "FLP Training" });
    await admin.fill("#grant-days", "30");
    await admin.getByRole("button", { name: "Zugang vergeben" }).click();
    check(await seen(admin.getByText("Zugang für zweit@flp.test vergeben.")), "Manueller Zugang vergeben");
    await other.goto(`${BASE}/programme/flp-training/inhalt`);
    check(await seen(other.getByText("Jeden Tag 10 Minuten mit dem Ball.")), "Manueller Zugang wirkt");
    await admin.locator("li", { hasText: "Beat Zweit" }).getByRole("button", { name: "Entziehen" }).click();
    check(await seen(admin.locator("li", { hasText: "Beat Zweit" }).getByText("Entzogen")), "Zugang entzogen");
    await other.goto(`${BASE}/programme/flp-training/inhalt`);
    check(await other.waitForURL("**/programme/flp-training", { timeout: 10000 }).then(() => true).catch(() => false), "Nach Entzug kein Zugang");
    check(sql(`select count(*) from public.audit_logs where entity_type='entitlements'`) >= "3", "Zugänge im Audit-Log");

    // 6. Rückerstattung
    const refund = await webhook({ id: "evt_refund", type: "charge.refunded", data: { object: { id: "ch_1", object: "charge", refunded: true, payment_intent: "pi_e2e" } } });
    check(refund.body.result === "refunded", "Rückerstattung per Webhook");
    await parent.goto(`${BASE}/programme/flp-training/inhalt`);
    check(await parent.waitForURL("**/programme/flp-training", { timeout: 10000 }).then(() => true).catch(() => false), "Nach Rückerstattung kein Zugang");
    await parent.goto(`${BASE}/meine-kaeufe`);
    check(await seen(parent.getByText("Rückerstattet", { exact: true })), "Bestellung als rückerstattet angezeigt");

    // 7. Rechte
    sql(`update public.user_roles set role='coach' where user_id=(select id from auth.users where email='zweit@flp.test');`);
    await other.goto(`${BASE}/admin/produkte`);
    check(await other.waitForURL(/\/admin$/, { timeout: 10000 }).then(() => true).catch(() => false), "Coach kommt nicht in die Shop-Verwaltung");
    const directOrder = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders`, { method: "POST", headers: { apikey: process.env.E2E_ANON_KEY, Authorization: `Bearer ${process.env.E2E_ANON_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ user_id: orderId, status: "paid", total_cents: 0 }) });
    check(directOrder.status === 401 || directOrder.status === 403, `REST: keine Bestellung ohne Service-Rolle (${directOrder.status})`);
  });

export default suite;
