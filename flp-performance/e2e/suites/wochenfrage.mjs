import { devices } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { runSuite } from "../lib.mjs";

/**
 * Wochenfrage: Familien antworten auf dem Handy ohne Login, der Trainer sieht die
 * Antworten im privaten Panel (Filter nach Athlet und Woche).
 */
const suite = () =>
  runSuite("Wochenfrage", async ({ BASE, OUT, ctx, register, login, check, seen, sql, browser }) => {
    const phone = async () => (await browser.newContext({ ...devices["iPhone 13"] })).newPage();

    // --- Handy: Frage öffnen und beantworten (ohne Login) ---------------------
    const kid = await phone();
    await kid.goto(`${BASE}/wochenfrage`);
    check(kid.url().endsWith("/wochenfrage"), "Link öffnet direkt die Frage (keine Weiterleitung zum Login)");
    const eyebrow = kid.locator("p.eyebrow", { hasText: "Wochenfrage" });
    check(await seen(eyebrow), "Kopfzeile WOCHENFRAGE sichtbar");
    check((await eyebrow.evaluate((el) => getComputedStyle(el).textTransform)) === "uppercase", "WOCHENFRAGE in Grossbuchstaben");
    const question = (await kid.locator("h1").textContent())?.trim() ?? "";
    check(question.endsWith("?"), `Frage angezeigt: «${question}»`);
    check(await seen(kid.getByText("Nicht geübt")), "Option «Nicht geübt» vorhanden");
    for (const n of ["1", "2", "3", "4", "5"]) {
      check((await kid.locator(`input[name=answer][value="${n}"]`).count()) === 1, `Option ${n} vorhanden`);
    }
    const overflow = await kid.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 1, "Handy: keine horizontale Überbreite");
    const axe = await new AxeBuilder({ page: kid }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    check(serious.length === 0, `Handy: WCAG AA${serious.length ? ` – ${serious.map((v) => v.id).join(", ")}` : ""}`);
    await kid.screenshot({ path: `${OUT}wochenfrage-handy-frage.png`, fullPage: true });

    // Ohne Auswahl → Hinweise
    await kid.getByRole("button", { name: "Antwort senden" }).tap();
    check(await seen(kid.getByText("Bitte gib deinen Namen ein.")), "Fehlender Name wird gemeldet");
    check(await seen(kid.getByText("Bitte wähle eine Antwort.")), "Fehlende Antwort wird gemeldet");

    // Antworten: Name + 4 antippen + senden
    const started = Date.now();
    await kid.fill("#wf-name", "Lio Beispiel");
    await kid.locator("label", { has: kid.locator('input[value="4"]') }).tap();
    await kid.getByRole("button", { name: "Antwort senden" }).tap();
    check(await seen(kid.getByText("Danke, Lio Beispiel!")), "Bestätigung nach dem Senden");
    check(Date.now() - started < 5000, `Antwort in wenigen Sekunden gesendet (${Date.now() - started} ms)`);
    await kid.screenshot({ path: `${OUT}wochenfrage-handy-danke.png`, fullPage: true });
    check(sql(`select athlete_name || ':' || rating from public.weekly_answers where athlete_key='lio beispiel'`) === "Lio Beispiel:4", "Antwort in der Datenbank gespeichert");

    // Nächster Besuch: Name ist gemerkt; Korrektur in derselben Woche ersetzt die Antwort
    await kid.goto(`${BASE}/wochenfrage`);
    check((await kid.inputValue("#wf-name")) === "Lio Beispiel", "Name wird auf dem Handy gemerkt");
    await kid.locator("label", { has: kid.locator('input[value="5"]') }).tap();
    await kid.getByRole("button", { name: "Antwort senden" }).tap();
    await seen(kid.getByText("Danke, Lio Beispiel!"));
    check(sql(`select count(*) || ':' || max(rating) from public.weekly_answers where athlete_key='lio beispiel'`) === "1:5", "Erneutes Senden korrigiert statt doppelt zu speichern");

    // Zweites Kind: «Nicht geübt»
    const kid2 = await phone();
    await kid2.goto(`${BASE}/wochenfrage`);
    await kid2.fill("#wf-name", "Mia Test");
    await kid2.getByText("Nicht geübt").tap();
    await kid2.getByRole("button", { name: "Antwort senden" }).tap();
    check(await seen(kid2.getByText("Danke, Mia Test!")), "«Nicht geübt» kann gesendet werden");

    // Antwort aus einer früheren Woche (für den Wochenfilter)
    sql(`insert into public.weekly_answers (week_start, theme, question_key, question, athlete_name, athlete_key, rating)
         values ('2026-11-12', 'kollektiv', 'kollektiv-1', 'Alte Testfrage?', 'Mia Test', 'mia test', 2)`);

    // --- Eigene Domain: «/» öffnet direkt die Frage ----------------------------
    const custom = await phone();
    const host = new URL(BASE);
    const customBase = `${host.protocol}//127.0.0.1:${host.port}`;
    await custom.goto(`${customBase}/`);
    check((await custom.locator("h1").textContent())?.trim() === question, "Eigene Domain: Startseite zeigt direkt die Wochenfrage");
    await custom.fill("#wf-name", "Noah Domain");
    await custom.locator("label", { has: custom.locator('input[value="3"]') }).tap();
    await custom.getByRole("button", { name: "Antwort senden" }).tap();
    check(await seen(custom.getByText("Danke, Noah Domain!")), "Eigene Domain: Senden funktioniert");
    const plain = await ctx(true);
    await plain.goto(`${BASE}/`);
    check((await plain.locator("h1").textContent())?.trim() !== question, "Hauptdomain zeigt weiterhin die normale Startseite");

    // --- Privates Panel --------------------------------------------------------
    const anon = await ctx(true);
    await anon.goto(`${BASE}/admin/wochenfrage`);
    check(anon.url().includes("/login"), "Panel ohne Login nicht erreichbar");

    const parent = await ctx(true);
    await register(parent, "Anna Beispiel", "eltern@flp.test");
    await parent.goto(`${BASE}/admin/wochenfrage`);
    const redirected = await parent.waitForURL((u) => !u.pathname.startsWith("/admin"), { timeout: 15000 }).then(() => true).catch(() => false);
    check(redirected && (await parent.getByText("Lio Beispiel").count()) === 0, "Eltern haben keinen Zugriff aufs Panel");

    const coach = await phone();
    await register(coach, "Felipe Admin", "admin@flp.test");
    sql(`update public.user_roles set role='admin' where user_id=(select id from auth.users where email='admin@flp.test')`);
    await coach.goto(`${BASE}/admin/wochenfrage`);
    const list = coach.getByTestId("answers");
    check(await seen(list.getByText("Lio Beispiel")), "Panel (Handy): Antwort von Lio sichtbar");
    check(await seen(list.getByText("Noah Domain")), "Panel: Antwort über eigene Domain sichtbar");
    check((await list.locator("li", { hasText: "Lio Beispiel" }).getByLabel("Antwort 5 von 5").count()) === 1, "Panel: korrigierte Antwort 5 angezeigt");
    check(await seen(list.locator("li", { hasText: "Mia Test" }).getByText("Nicht geübt")), "Panel: «Nicht geübt» angezeigt");
    check((await coach.getByTestId("family-link").textContent())?.trim() === "https://127.0.0.1:3100", "Panel zeigt den Link der eigenen Domain");
    check((await coach.locator("main h2, section p.font-display").filter({ hasText: question }).count()) >= 1, "Panel zeigt die aktuelle Frage");
    await coach.screenshot({ path: `${OUT}wochenfrage-panel-handy.png`, fullPage: true });

    // Filter Athlet
    await coach.selectOption("select[name=athlet]", "mia test");
    await coach.getByRole("button", { name: "Filtern" }).tap();
    await coach.waitForURL(/athlet=mia/);
    check((await list.locator("li").count()) === 2, "Filter Athlet: nur Mia (2 Wochen)");
    // Filter Athlet + Woche
    await coach.selectOption("select[name=woche]", "2026-11-12");
    await coach.getByRole("button", { name: "Filtern" }).tap();
    await coach.waitForURL(/woche=2026-11-12/);
    check((await list.locator("li").count()) === 1 && (await seen(list.getByText("Alte Testfrage?"))), "Filter Woche: nur die frühere Woche");
    await coach.getByRole("link", { name: "Zurücksetzen" }).tap();
    await coach.waitForURL((u) => !u.search);
    check((await list.locator("li").count()) === 4, "Zurücksetzen zeigt alle 4 Antworten");

    // Desktop-Ansicht
    const desk = await ctx(false);
    await login(desk, "admin@flp.test");
    await desk.goto(`${BASE}/admin/wochenfrage`);
    await desk.waitForLoadState("networkidle");
    await desk.screenshot({ path: `${OUT}wochenfrage-panel-desktop.png`, fullPage: true });

    // Löschen (Spam)
    await desk.getByRole("button", { name: "Antwort von Noah Domain löschen" }).click();
    await desk.getByTestId("answers").getByText("Noah Domain").waitFor({ state: "detached" });
    check(sql(`select count(*) from public.weekly_answers where athlete_key='noah domain'`) === "0", "Trainer kann Antworten löschen");
  });

export default suite;
