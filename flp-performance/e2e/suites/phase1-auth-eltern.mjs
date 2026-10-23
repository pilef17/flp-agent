import { runSuite } from "../lib.mjs";

const suite = () =>
  runSuite("Phase 1 · Auth, Eltern, Admin, Datenschutz", async ({ BASE, PW, OUT, ctx, register, login, check, seen, sql, mailLink }) => {
    // A: Admin registrieren + Rolle per SQL vergeben (Bootstrap wie in der Doku)
    const admin = await ctx();
    await register(admin, "Felipe Admin", "admin@flp.test");
    check(admin.url().endsWith("/elternbereich"), "Registrierung + E-Mail-Bestätigung → Elternbereich");
    sql(`update public.user_roles set role='admin' where user_id=(select id from auth.users where email='admin@flp.test');`);
    await admin.goto(`${BASE}/startseite`);
    await admin.waitForURL("**/admin");
    check(admin.url().endsWith("/admin"), "Admin wird auf /admin geleitet");

    // B: Spieler erfassen (inkl. Validierungsfehler)
    await admin.goto(`${BASE}/admin/spieler`);
    await admin.fill("#f-firstName", "Lio");
    await admin.click("form >> text=Spieler erfassen");
    await admin.getByText("Nachname fehlt.").waitFor();
    check(await admin.inputValue("#f-firstName") === "Lio", "Eingaben bleiben nach Validierungsfehler erhalten");
    await admin.fill("#f-lastName", "Beispiel");
    await admin.fill("#f-birthYear", "2015");
    await admin.fill("#f-position", "Flügel");
    await admin.click("form >> text=Spieler erfassen");
    await admin.waitForURL(/\/admin\/spieler\/[0-9a-f-]{36}/);
    const playerUrl = admin.url().split("?")[0];
    const playerId = playerUrl.split("/").at(-1);
    check(await seen(admin.getByText("Spieler erfasst")), "Spieler erfasst – Erfolgsmeldung");
    sql(`update public.players set is_test_data=true where id='${playerId}';`);

    // C: Elternteil A registriert sich
    const parentA = await ctx(true);
    await register(parentA, "Anna Beispiel", "eltern-a@flp.test");
    check(await seen(parentA.getByText("Noch kein Kind verknüpft")), "Elternteil ohne Kind sieht Leerzustand");

    // D: Admin verknüpft bestehendes Konto
    await admin.goto(playerUrl);
    await admin.fill("#f-fullName", "Anna Beispiel");
    await admin.fill("#f-email", "eltern-a@flp.test");
    await admin.click("text=Einladen & verknüpfen");
    await admin.getByText("Bestehendes Konto eltern-a@flp.test").waitFor();
    check(true, "Bestehendes Elternkonto verknüpft");

    // E: Admin lädt neues Elternteil ein → Einladung per Mail → Passwort setzen
    let t = Date.now();
    await admin.fill("#f-fullName", "Marco Beispiel");
    await admin.fill("#f-email", "vater-neu@flp.test");
    await admin.selectOption("#f-relationship", "Vater");
    await admin.click("text=Einladen & verknüpfen");
    await admin.getByText("Einladung an vater-neu@flp.test gesendet").waitFor();
    const invite = await ctx();
    await invite.goto(await mailLink("vater-neu@flp.test", t));
    await invite.waitForURL("**/passwort-neu");
    await invite.fill("#f-password", PW);
    await invite.fill("#f-passwordConfirm", PW);
    await invite.click("text=Passwort speichern");
    await invite.waitForURL("**/elternbereich");
    check(await seen(invite.getByRole("heading", { name: "Lio Beispiel" })), "Eingeladener Vater: Einladung → Passwort → sieht Kind");

    // F: Einwilligung
    await parentA.goto(`${BASE}/elternbereich`);
    check(await seen(parentA.getByText("Bitte bestätige unten die Einwilligung")), "Hinweis auf fehlende Einwilligung");
    await parentA.locator("li", { hasText: "Bearbeitung der Trainingsdaten" }).getByRole("button", { name: "Einwilligen" }).click();
    await parentA.waitForLoadState("networkidle");
    await parentA.locator("li", { hasText: "Bearbeitung der Trainingsdaten" }).getByText("Erteilt").waitFor();
    check(await parentA.getByText("Bitte bestätige unten die Einwilligung").count() === 0, "Einwilligung erteilt, Hinweis verschwindet");
    check(sql(`select count(*) from public.guardian_consents where player_id='${playerId}'`) === "1", "Einwilligung in DB protokolliert");

    // G: Echte Testdaten via SQL (Beurteilungs-UI folgt in Phase 3) → Anzeige prüfen
    const adminId = sql(`select id from auth.users where email='admin@flp.test'`);
    const monday = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); })();
    sql(`
    insert into public.exercises (id, code, title, category, status) values ('20000000-0000-0000-0000-000000000001','KOO-001','Koordinationsleiter','koordination','published');
    insert into public.assessments (id, player_id, coach_id, kind, assessed_on, status) values
     ('40000000-0000-0000-0000-000000000001','${playerId}','${adminId}','initial','2026-08-01','draft'),
     ('40000000-0000-0000-0000-000000000002','${playerId}','${adminId}','regular','2026-10-01','draft'),
     ('40000000-0000-0000-0000-000000000003','${playerId}','${adminId}','regular','2026-10-15','draft');
    insert into public.assessment_scores (assessment_id, category_id, score) select '40000000-0000-0000-0000-000000000001', id, 2 from public.assessment_categories;
    insert into public.assessment_scores (assessment_id, category_id, score) select '40000000-0000-0000-0000-000000000002', id, case when position=8 then null else 3 end from public.assessment_categories;
    update public.assessments set status='published' where id in ('40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002');
    insert into public.coach_feedback (player_id, author_id, title, body, status) values
     ('${playerId}','${adminId}','Starke Ballführung','Weiter so mit dem schwachen Fuss.','published'),
     ('${playerId}','${adminId}','Interner Entwurf','Nicht sichtbar.','draft');
    insert into public.training_plans (id, player_id, title, week_start, status) values ('30000000-0000-0000-0000-000000000001','${playerId}','Woche Koordination','${monday}','published');
    insert into public.training_sessions (id, plan_id, scheduled_on, title) values ('31000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','${monday}','Einheit Montag');
    insert into public.session_exercises (session_id, exercise_id) values ('31000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
    `);
    await parentA.goto(`${BASE}/elternbereich`);
    check(await seen(parentA.getByText(/Erstbeurteilung · 01\.08\.2026/)), "Chart: Erstbeurteilung (rot) angezeigt");
    check(await seen(parentA.getByText(/Aktuell · 01\.10\.2026/)), "Chart: aktuelle = neueste veröffentlichte (Entwurf ignoriert)");
    check(await seen(parentA.getByText("n. b.")), "Nicht beurteilt wird als «n. b.» angezeigt");
    check(await seen(parentA.getByText("Starke Ballführung")), "Freigegebenes Feedback sichtbar");
    check(await parentA.getByText("Interner Entwurf").count() === 0, "Feedback-Entwurf unsichtbar");
    await parentA.screenshot({ path: `${OUT}/e2e_parent_mobile.png`, fullPage: true });
    await parentA.getByRole("button", { name: "Einheit als erledigt markieren" }).click();
    await parentA.getByRole("button", { name: "Einheit als offen markieren" }).waitFor();
    check(true, "Einheit als erledigt markiert");

    // H: Elternteil B sieht nichts Fremdes
    const parentB = await ctx();
    await register(parentB, "Beat Fremd", "eltern-b@flp.test");
    check(await seen(parentB.getByText("Noch kein Kind verknüpft")), "Elternteil B: kein fremdes Kind sichtbar");
    await parentB.goto(playerUrl);
    const redirected = await parentB.waitForURL("**/elternbereich", { timeout: 15000 }).then(() => true).catch(() => false);
    check(redirected, "Elternteil B: Admin-Spielerseite leitet auf Elternbereich um");
    check(await parentB.getByText("Lio Beispiel").count() === 0, "Elternteil B: Spielername nie angezeigt");
    const leak = await parentB.evaluate(async ([url, key, id]) => {
      const tokenCookie = document.cookie; // httpOnly nicht nötig: direkter REST-Aufruf mit anon key
      const r = await fetch(`${url}/rest/v1/players?id=eq.${id}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      return r.status;
    }, [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.E2E_ANON_KEY, playerId]);
    check(leak === 401 || leak === 403, `REST-API anonym: Spielerdaten verweigert (HTTP ${leak})`);

    // I: Datenschutz-Antrag
    await parentA.goto(`${BASE}/konto`);
    await parentA.selectOption("#f-requestType", "deletion");
    await parentA.selectOption("#f-playerId", playerId);
    await parentA.fill("#f-details", "Bitte alle Daten von Lio löschen.");
    await parentA.click("text=Antrag senden");
    await parentA.getByText("Dein Antrag ist eingegangen").waitFor();
    await admin.goto(`${BASE}/admin/datenschutz`);
    check(await seen(admin.getByText("Bitte alle Daten von Lio löschen.")), "Admin sieht Datenschutz-Antrag");
    await admin.selectOption("select[name=status]", "completed");
    await admin.fill("input[name=resolutionNote]", "Daten wurden gelöscht.");
    await admin.click("form >> text=Speichern");
    await admin.waitForLoadState("networkidle");
    await parentA.goto(`${BASE}/konto`);
    check(await seen(parentA.getByText("Daten wurden gelöscht.")), "Elternteil sieht erledigten Antrag");
    await admin.goto(`${BASE}/admin`);
    check(await seen(admin.getByText("Letzte sensible Änderungen")), "Admin-Dashboard mit Audit-Log");
    await admin.screenshot({ path: `${OUT}/e2e_admin_desktop.png`, fullPage: true });
    await admin.goto(playerUrl);
    await admin.screenshot({ path: `${OUT}/e2e_admin_player.png`, fullPage: true });

    // J: Passwort zurücksetzen
    const reset = await ctx();
    t = Date.now();
    await reset.goto(`${BASE}/passwort-vergessen`);
    await reset.fill("#f-email", "eltern-b@flp.test");
    await reset.click("button[type=submit]");
    await reset.getByText("Falls ein Konto").waitFor();
    await reset.goto(await mailLink("eltern-b@flp.test", t));
    await reset.waitForURL("**/passwort-neu");
    await reset.fill("#f-password", "Neues-Passwort-456");
    await reset.fill("#f-passwordConfirm", "Neues-Passwort-456");
    await reset.click("text=Passwort speichern");
    await reset.waitForURL("**/elternbereich");
    const fresh = await ctx();
    await login(fresh, "eltern-b@flp.test", "Neues-Passwort-456");
    check(await fresh.waitForURL("**/elternbereich", { timeout: 15000 }).then(() => true).catch(() => false), "Passwort-Reset: Login mit neuem Passwort");
    await fresh.goto(`${BASE}/login`);
    await fresh.click("text=Abmelden").catch(() => {});
    const wrong = await ctx();
    await wrong.goto(`${BASE}/login`);
    await wrong.fill("#f-email", "eltern-b@flp.test");
    await wrong.fill("#f-password", PW);
    await wrong.click("button[type=submit]");
    check(await seen(wrong.getByText("E-Mail oder Passwort ist nicht korrekt")), "Altes Passwort abgelehnt");

    // Abmelden
    await parentA.click("text=Abmelden");
    await parentA.waitForURL("**/login");
    await parentA.goto(`${BASE}/elternbereich`);
    check(parentA.url().includes("/login"), "Nach Abmeldung: geschützte Seite → Login");
  });

export default suite;
