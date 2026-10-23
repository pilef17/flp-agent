import { runSuite } from "../lib.mjs";

const suite = () =>
  runSuite("Phase 3 · Beurteilungen, Entwicklung, Feedback", async ({ BASE, PW, OUT, ctx, register, login, check, seen, sql, mailLink }) => {
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(new Date());
    const addDays = (d, n) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
    const pick = (page, category, value) => page.locator(`[role=radiogroup][aria-labelledby]`).filter({ has: page.locator(`xpath=..`) }).first() && page.locator(`li:has(> span:text-is("${category}")) label:has(input[value="${value}"])`).click();

    // Setup
    const admin = await ctx();
    await register(admin, "Felipe Admin", "admin@flp.test");
    sql(`update public.user_roles set role='admin' where user_id=(select id from auth.users where email='admin@flp.test');`);
    const parent = await ctx(true);
    await register(parent, "Anna Beispiel", "eltern@flp.test");
    await admin.goto(`${BASE}/admin/spieler`);
    await admin.fill("#f-firstName", "Lio"); await admin.fill("#f-lastName", "Beispiel"); await admin.fill("#f-birthYear", "2015");
    await admin.click("form >> text=Spieler erfassen");
    await admin.waitForURL(/\/admin\/spieler\/[0-9a-f-]{36}/);
    const playerUrl = admin.url().split("?")[0]; const playerId = playerUrl.split("/").at(-1);
    sql(`update public.players set is_test_data=true where id='${playerId}';`);
    await admin.fill("#f-fullName", "Anna Beispiel"); await admin.fill("#f-email", "eltern@flp.test");
    await admin.click("text=Einladen & verknüpfen");
    await admin.getByText("Bestehendes Konto").waitFor();

    // 1. Übersicht: Spieler ohne Erstbeurteilung
    await admin.goto(`${BASE}/admin/beurteilungen`);
    check(await seen(admin.locator("a", { hasText: "Lio Beispiel" }).filter({ hasText: "Beurteilen" })), "Übersicht: Spieler ohne Erstbeurteilung gelistet");

    // 2. Erstbeurteilung anlegen (Zukunftsdatum abgelehnt)
    await admin.goto(playerUrl);
    check((await admin.locator("#f-kind option").allTextContents()).includes("Erstbeurteilung"), "Erstbeurteilung wählbar");
    await admin.selectOption("#f-kind", "initial");
    await admin.fill("#f-assessedOn", addDays(today, 3));
    await admin.click("text=Beurteilung beginnen");
    check(await seen(admin.getByText("Das Datum darf nicht in der Zukunft liegen.")), "Datum in der Zukunft abgelehnt");
    await admin.fill("#f-assessedOn", "2026-09-01");
    await admin.click("text=Beurteilung beginnen");
    await admin.waitForURL(/\/admin\/beurteilungen\/[0-9a-f-]{36}/);
    const initialUrl = admin.url();
    check(await seen(admin.getByText("Erstbeurteilung · 01.09.2026")), "Editor geöffnet");

    const scores1 = { "Technik": "2", "Koordination": "2", "Schnelligkeit": "3", "Antritt & Beschleunigung": "2", "Spielverständnis": "1", "Entscheidungsfähigkeit": "2", "Kraft & Körperstabilität": "2" };
    for (const [c, v] of Object.entries(scores1)) await pick(admin, c, v);
    await admin.fill(`input[aria-label="Notiz zu Technik"]`, "Schwacher Fuss noch unsicher");
    await admin.fill("#f-coachNotes", "Guter Start, viel Potenzial.");
    await admin.getByRole("button", { name: "Veröffentlichen" }).click();
    check(await seen(admin.getByText("Bitte bestätigen – veröffentlichte Beurteilungen")), "Veröffentlichen verlangt Bestätigung");
    check(await admin.locator(`li:has(> span:text-is("Technik")) input[value="2"]`).isChecked(), "Werte bleiben nach Fehler erhalten");
    await admin.getByRole("button", { name: "Entwurf speichern" }).click();
    check(await seen(admin.getByText("Entwurf gespeichert.")), "Entwurf gespeichert");
    await admin.reload();
    check(await admin.locator(`li:has(> span:text-is("Spielverständnis")) input[value="1"]`).isChecked(), "Gespeicherte Werte nach Neuladen");
    check(await admin.locator(`li:has(> span:text-is("Ausdauer & Belastbarkeit")) input[value="nb"]`).isChecked(), "Nicht bewertet = n. b.");
    await admin.screenshot({ path: `${OUT}/p3_editor_desktop.png`, fullPage: true });
    await admin.check("input[name=confirmPublish]");
    await admin.getByRole("button", { name: "Veröffentlichen" }).click();
    check(await seen(admin.getByText("Veröffentlichte Beurteilungen bleiben als Verlauf unverändert")), "Veröffentlicht → nur noch lesbar");
    check((await admin.getByRole("button", { name: "Entwurf speichern" }).count()) === 0, "Kein Bearbeiten nach Veröffentlichung");

    // 3. Folgebeurteilung: leere Veröffentlichung abgelehnt
    await admin.goto(playerUrl);
    check(!(await admin.locator("#f-kind option").allTextContents()).includes("Erstbeurteilung"), "Zweite Erstbeurteilung nicht wählbar");
    await admin.fill("#f-assessedOn", "2026-10-15");
    await admin.click("text=Beurteilung beginnen");
    await admin.waitForURL(/\/admin\/beurteilungen\/[0-9a-f-]{36}/);
    await admin.check("input[name=confirmPublish]");
    await admin.getByRole("button", { name: "Veröffentlichen" }).click();
    check(await seen(admin.getByText("Zum Veröffentlichen mindestens eine Kompetenz bewerten.")), "Leere Beurteilung nicht veröffentlichbar");
    const scores2 = { "Technik": "3", "Koordination": "4", "Schnelligkeit": "3", "Antritt & Beschleunigung": "3", "Spielverständnis": "2", "Entscheidungsfähigkeit": "3", "Kraft & Körperstabilität": "3", "Ausdauer & Belastbarkeit": "4" };
    for (const [c, v] of Object.entries(scores2)) await pick(admin, c, v);
    await admin.check("input[name=confirmPublish]");
    await admin.getByRole("button", { name: "Veröffentlichen" }).click();
    check(await seen(admin.getByText("Veröffentlichte Beurteilungen bleiben als Verlauf unverändert")), "Folgebeurteilung veröffentlicht");

    // Entwurf, der unsichtbar bleiben muss
    await admin.goto(playerUrl);
    await admin.fill("#f-assessedOn", today);
    await admin.click("text=Beurteilung beginnen");
    await admin.waitForURL(/\/admin\/beurteilungen\/[0-9a-f-]{36}/);
    const draftUrl = admin.url();
    await pick(admin, "Technik", "5");
    await admin.getByRole("button", { name: "Entwurf speichern" }).click();
    await admin.getByText("Entwurf gespeichert.").waitFor();

    // 4. Feedback
    await admin.goto(playerUrl);
    await admin.locator("form:has(textarea[name=body])").getByLabel("Titel").fill("Starke Woche");
    await admin.fill("textarea[name=body]", "Lio war sehr konzentriert.\nWeiter so beim Antritt.");
    await admin.getByRole("button", { name: "Veröffentlichen" }).click();
    check(await seen(admin.getByText("Feedback veröffentlicht.")), "Feedback veröffentlicht");
    await admin.locator("form:has(textarea[name=body])").getByLabel("Titel").fill("Interne Notiz");
    await admin.fill("textarea[name=body]", "Noch nicht teilen.");
    await admin.getByRole("button", { name: "Als Entwurf speichern" }).click();
    check(await seen(admin.getByText("Feedback als Entwurf gespeichert.")), "Feedback-Entwurf gespeichert");
    await admin.locator("a", { hasText: "Starke Woche" }).click();
    await admin.waitForURL(/\/admin\/feedback\//);
    await admin.getByLabel("Titel").fill("Sehr starke Woche");
    await admin.getByRole("button", { name: "Speichern", exact: true }).click();
    check(await seen(admin.getByText("Gespeichert und veröffentlicht.")), "Veröffentlichtes Feedback bearbeitet");
    await admin.goto(`${BASE}/admin/beurteilungen`);
    check(await seen(admin.getByText("Interne Notiz")), "Übersicht: Feedback-Entwürfe");
    check(await seen(admin.getByText("Alles erfasst")), "Übersicht: alle haben Erstbeurteilung");

    // 5. Eltern: Entwicklung
    await parent.goto(`${BASE}/entwicklung`);
    check(await seen(parent.getByText(/Erstbeurteilung · 01\.09\.2026/)), "Entwicklung: Erstbeurteilung im Vergleich");
    check(await seen(parent.getByText(/Aktuell · 15\.10\.2026/)), "Entwicklung: aktuell = neueste veröffentlichte (Entwurf ignoriert)");
    check((await parent.locator("svg[role=img]").count()) === 8, "Verlauf: 8 Kleindiagramme");
    check(await seen(parent.locator("svg[role=img][aria-label^='Ausdauer & Belastbarkeit: 01.09.2026: nicht beurteilt']")), "Verlauf: n. b. als Lücke beschrieben");
    const headers = await parent.locator("table thead th").allTextContents();
    check(headers.length === 3 && !headers.join().includes(today.split("-").reverse().join(".")), "Tabelle: 2 veröffentlichte Beurteilungen, kein Entwurf");
    check(await seen(parent.getByText("Guter Start, viel Potenzial.")), "Kommentar des Trainers sichtbar");
    check(await seen(parent.getByText("Schwacher Fuss noch unsicher")), "Notiz je Kompetenz sichtbar");
    await parent.screenshot({ path: `${OUT}/p3_entwicklung_mobile.png`, fullPage: true });

    // 6. Eltern: Feedback
    await parent.goto(`${BASE}/feedback`);
    check(await seen(parent.getByRole("heading", { name: "Sehr starke Woche" })), "Feedback-Seite: bearbeiteter Titel");
    check((await parent.getByText("Interne Notiz").count()) === 0, "Feedback-Entwurf unsichtbar");
    await parent.goto(`${BASE}/elternbereich`);
    check(await seen(parent.getByRole("link", { name: "Verlauf →" })) && await seen(parent.getByRole("link", { name: "Alle →" })), "Übersicht verlinkt Entwicklung & Feedback");
    const navItems = await parent.locator("nav[aria-label='Mobile Navigation'] a").allTextContents();
    check(navItems.join("|") === "Start|Plan|Übungen|Entwicklung|Konto", `Mobile Navigation Eltern (${navItems.join("|")})`);

    // 7. Zugriffsschutz
    await parent.goto(draftUrl);
    check(await parent.waitForURL("**/elternbereich", { timeout: 15000 }).then(() => true).catch(() => false), "Eltern: Beurteilungs-Editor nicht erreichbar");
    const leak = sql(`set role authenticated; select set_config('request.jwt.claims', json_build_object('sub', (select id from auth.users where email='eltern@flp.test'))::text, false); select count(*) from public.assessments;`).split("\n").at(-1);
    check(leak === "2", `RLS: Eltern sehen nur die 2 veröffentlichten Beurteilungen (${leak})`);
    const other = await ctx();
    await register(other, "Beat Fremd", "fremd@flp.test");
    await other.goto(`${BASE}/entwicklung?spieler=${playerId}`);
    check(await seen(other.getByText("Noch kein Spielerprofil")), "Fremdes Elternteil: keine Entwicklung");
    await other.goto(`${BASE}/feedback?spieler=${playerId}`);
    check(await seen(other.getByText("Noch kein Spielerprofil")), "Fremdes Elternteil: kein Feedback");

    // 8. Entwurf verwerfen
    await admin.goto(draftUrl);
    await admin.getByRole("button", { name: "Entwurf verwerfen" }).click();
    await admin.waitForURL(playerUrl);
    check(sql(`select count(*) from public.assessments where player_id='${playerId}'`) === "2", "Entwurf verworfen, veröffentlichte bleiben");
    await admin.goto(initialUrl);
    check(await seen(admin.getByText("Schwacher Fuss noch unsicher")), "Veröffentlichte Erstbeurteilung unverändert lesbar");
  });

export default suite;
