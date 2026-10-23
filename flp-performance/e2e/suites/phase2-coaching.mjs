import { runSuite } from "../lib.mjs";

const suite = () =>
  runSuite("Phase 2 · Übungen, Pläne, Kalender", async ({ BASE, PW, OUT, ctx, register, login, check, seen, sql, mailLink }) => {
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(new Date());
    const addDays = (d, n) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
    const monday = addDays(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));

    // Setup: Admin + Elternteil + Spieler
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

    // 1. Übung erstellen (mit Validierungsfehler)
    await admin.goto(`${BASE}/admin/uebungen`);
    check(await seen(admin.getByText("Noch keine Übungen")), "Admin-Bibliothek: Leerzustand");
    await admin.click("text=Übung erstellen >> nth=-1");
    check(await seen(admin.getByText("Bitte einen Titel eingeben.")), "Übung: Validierung ohne Titel");
    await admin.fill("#f-title", "Ballführung im Slalom");
    await admin.selectOption("#f-category", "technik");
    await admin.fill("#f-ageMin", "12"); await admin.fill("#f-ageMax", "8");
    await admin.click("text=Übung erstellen >> nth=-1");
    check(await seen(admin.getByText("Das Höchstalter muss über dem Mindestalter liegen.")), "Übung: Altersbereich geprüft");
    check(await admin.inputValue("#f-title") === "Ballführung im Slalom", "Übung: Eingaben bleiben erhalten");
    await admin.fill("#f-ageMin", "8"); await admin.fill("#f-ageMax", "12");
    await admin.fill("#f-sets", "3"); await admin.fill("#f-repetitions", "10"); await admin.fill("#f-restSeconds", "30");
    await admin.fill("#f-coachingInstructions", "Kopf hoch, kleine Kontakte mit beiden Füssen.");
    await admin.fill("#f-safetyNotes", "Genug Abstand zwischen den Hütchen.");
    await admin.click("text=Übung erstellen >> nth=-1");
    await admin.waitForURL(/\/admin\/uebungen\/[0-9a-f-]{36}/);
    const ex1Url = admin.url().split("?")[0]; const ex1 = ex1Url.split("/").at(-1);
    check(await seen(admin.getByText("Übung TEC-001")), "Übungs-ID TEC-001 automatisch vergeben");
    check(await seen(admin.getByText("Video auswählen")), "Video-Upload-Feld vorhanden");
    check(await seen(admin.getByText("Entwurf", { exact: true })), "Neue Übung ist Entwurf");
    await admin.click("button:has-text('Freigeben')");
    check(await seen(admin.getByText("Freigegeben", { exact: true })), "Übung freigegeben");
    // Bearbeiten
    await admin.fill("#f-description", "Dribbling durch 6 Hütchen.");
    await admin.click("text=Speichern");
    check(await seen(admin.getByText("Übung gespeichert.")), "Übung bearbeitet");

    await admin.goto(`${BASE}/admin/uebungen`);
    await admin.fill("#f-title", "Koordinationsleiter");
    await admin.selectOption("#f-category", "koordination");
    await admin.click("text=Übung erstellen >> nth=-1");
    await admin.waitForURL(/\/admin\/uebungen\/[0-9a-f-]{36}/);
    check(await seen(admin.getByText("Übung KOO-001")), "Zweite Kategorie: KOO-001");
    await admin.click("button:has-text('Freigeben')");
    await admin.getByText("Freigegeben", { exact: true }).waitFor();
    await admin.goto(`${BASE}/admin/uebungen`);
    await admin.fill("#f-title", "Geheimer Entwurf");
    await admin.click("text=Übung erstellen >> nth=-1");
    await admin.waitForURL(/\/admin\/uebungen\/[0-9a-f-]{36}/);
    await admin.goto(`${BASE}/admin/uebungen?kategorie=koordination`);
    check(await seen(admin.getByText("Koordinationsleiter")) && (await admin.getByText("Ballführung im Slalom").count()) === 0, "Kategoriefilter");

    // 2. Plan erstellen
    await admin.goto(playerUrl);
    await admin.fill("#f-title", "Woche Technik");
    await admin.fill("#f-weekDate", today);
    await admin.click("text=Plan erstellen");
    await admin.waitForURL(/\/admin\/plaene\/[0-9a-f-]{36}/);
    const planUrl = admin.url();
    check(await seen(admin.getByText("Noch keine Einheiten")), "Builder: Leerzustand");
    check(await admin.getByRole("button", { name: "Für Familie veröffentlichen" }).isDisabled(), "Leerer Plan kann nicht veröffentlicht werden");
    await admin.selectOption("#f-scheduledOn", today);
    await admin.fill("#f-title", "Technik & Koordination");
    await admin.click("text=Einheit hinzufügen");
    await admin.getByRole("heading", { name: "Technik & Koordination" }).waitFor();
    check(true, "Einheit hinzugefügt");
    const exSelect = admin.locator("select[name=exerciseId]").first();
    check((await exSelect.locator("option").allTextContents()).every((t) => !t.includes("Geheimer Entwurf")), "Entwürfe nicht wählbar");
    await admin.locator("form:has(select[name=exerciseId]) button[type=submit]").first().click();
    check(await seen(admin.getByText("Bitte eine Übung wählen.")), "Builder: Übung muss gewählt werden");
    await admin.locator("select[name=exerciseId]").first().selectOption({ label: "TEC-001 · Ballführung im Slalom" });
    await admin.locator("summary:has-text('Dosierung anpassen')").first().click();
    await admin.locator("input[name=sets]").first().fill("4");
    await admin.locator("form:has(select[name=exerciseId]) button[type=submit]").first().click();
    await admin.getByText("4 × 10 · Pause 30 Sek.").waitFor();
    check(true, "Dosierung überschrieben, Rest aus Standard übernommen");
    await admin.locator("select[name=exerciseId]").first().selectOption({ label: "KOO-001 · Koordinationsleiter" });
    await admin.locator("form:has(select[name=exerciseId]) button[type=submit]").first().click();
    await admin.locator("ol li").nth(1).getByText("Koordinationsleiter").waitFor();
    await admin.locator("ol li").nth(1).getByRole("button", { name: "Nach oben" }).click();
    await admin.locator("ol li").nth(0).getByText("Koordinationsleiter").waitFor({ timeout: 10000 }).catch(() => {});
    check((await admin.locator("ol li").nth(0).textContent()).includes("Koordinationsleiter"), "Reihenfolge geändert");
    await admin.getByRole("button", { name: "Für Familie veröffentlichen" }).click();
    check(await seen(admin.getByText("Veröffentlicht", { exact: true })), "Plan veröffentlicht");
    await admin.screenshot({ path: `${OUT}/p2_builder_desktop.png`, fullPage: true });

    // Doppelter Plan in derselben Woche
    await admin.goto(playerUrl);
    await admin.locator("summary:has-text('Neuen Wochenplan')").click();
    await admin.fill("#f-title", "Doppelt");
    await admin.fill("#f-weekDate", monday);
    await admin.click("text=Plan erstellen");
    check(await seen(admin.getByText("Für diese Woche gibt es bereits einen Plan.")), "Nur ein Plan pro Woche");
    check(await seen(admin.getByText("Woche Technik")), "Planliste beim Spieler");

    // 3. Eltern: Kalender
    await parent.goto(`${BASE}/trainingsplan`);
    check(await seen(parent.getByRole("heading", { name: "Woche Technik" })), "Kalender zeigt veröffentlichten Plan");
    check(await seen(parent.getByText("· Heute")), "Heutiger Tag markiert");
    check(await seen(parent.getByText("Kein Training – Erholung")), "Tage ohne Training");
    const items = parent.locator("li:has(a[href^='/uebungen/'])");
    check((await items.nth(0).textContent()).includes("Koordinationsleiter"), "Reihenfolge beim Elternteil übernommen");
    check(await seen(parent.getByText("4 × 10 · Pause 30 Sek.")), "Dosierung sichtbar");
    await parent.screenshot({ path: `${OUT}/p2_calendar_mobile.png`, fullPage: true });
    await parent.getByRole("button", { name: "Übung als erledigt markieren" }).first().click();
    check(await seen(parent.getByRole("button", { name: "Übung als offen markieren" })), "Übung im Kalender erledigt");
    await parent.getByRole("button", { name: "Einheit als erledigt markieren" }).click();
    check(await seen(parent.getByText("1 von 1 Einheiten erledigt")), "Wochenfortschritt");
    await parent.getByRole("link", { name: "Nächste Woche" }).click();
    check(await seen(parent.getByText("Kein Plan für diese Woche")), "Nächste Woche ohne Plan");
    check(await seen(parent.getByText("Zur aktuellen Woche")), "Link zur aktuellen Woche");
    await parent.goto(`${BASE}/trainingsplan?woche=kaputt`);
    check(await seen(parent.getByRole("heading", { name: "Woche Technik" })), "Ungültiger Wochenparameter fällt auf aktuelle Woche zurück");

    // 4. Eltern: Bibliothek & Details
    await parent.goto(`${BASE}/uebungen`);
    check(await seen(parent.getByText("Ballführung im Slalom")) && await seen(parent.getByText("Koordinationsleiter")), "Bibliothek zeigt freigegebene Übungen");
    check((await parent.getByText("Geheimer Entwurf").count()) === 0, "Entwurf in Bibliothek unsichtbar");
    await parent.screenshot({ path: `${OUT}/p2_library_mobile.png`, fullPage: true });
    await parent.getByText("Ballführung im Slalom").click();
    await parent.waitForURL(`**/uebungen/${ex1}`);
    check(await seen(parent.getByText("Kopf hoch, kleine Kontakte")), "Details: Coaching-Hinweise");
    check(await seen(parent.getByText("Genug Abstand")), "Details: Sicherheitshinweise");
    check(await seen(parent.getByText("noch kein Video verfügbar")), "Details: ohne Video sauberer Hinweis");
    const draftId = sql(`select id from public.exercises where title='Geheimer Entwurf'`);
    await parent.goto(`${BASE}/uebungen/${draftId}`);
    check(await seen(parent.getByText("Seite nicht gefunden")), "Entwurf per URL: nicht gefunden");

    // 5. Spielerprofil & Zugriffsschutz
    await parent.goto(`${BASE}/spieler/${playerId}`);
    check(await seen(parent.getByText("Starker Fuss")) && await seen(parent.getByRole("heading", { name: "Lio Beispiel" })), "Spielerprofil für Eltern");
    await parent.goto(planUrl);
    check(await parent.waitForURL("**/elternbereich", { timeout: 15000 }).then(() => true).catch(() => false), "Eltern: Plan-Builder nicht erreichbar");
    const other = await ctx();
    await register(other, "Beat Fremd", "fremd@flp.test");
    await other.goto(`${BASE}/spieler/${playerId}`);
    check(await seen(other.getByText("Seite nicht gefunden")), "Fremdes Elternteil: Spielerprofil nicht gefunden");
    await other.goto(`${BASE}/trainingsplan?spieler=${playerId}`);
    check(await seen(other.getByText("Noch kein Spielerprofil")), "Fremdes Elternteil: kein Kalender");
    await other.goto(`${BASE}/uebungen`);
    check(await seen(other.getByText("Noch keine Übungen freigeschaltet")), "Ohne Coaching/Plan: leere Bibliothek");

    // 6. Plan zurückziehen → Familie sieht ihn nicht mehr
    await admin.goto(planUrl);
    await admin.getByRole("button", { name: "Zurückziehen" }).click();
    await admin.getByText("Entwurf", { exact: true }).waitFor();
    await parent.goto(`${BASE}/trainingsplan`);
    check(await seen(parent.getByText("Kein Plan für diese Woche")), "Zurückgezogener Plan unsichtbar");
  });

export default suite;
