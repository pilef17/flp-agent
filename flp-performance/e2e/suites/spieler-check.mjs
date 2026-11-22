import { devices } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { runSuite } from "../lib.mjs";

/**
 * Spieler-Check: Eltern beantworten 12 Fragen ohne Login, sehen ihr Niveau und können
 * Kontaktdaten hinterlassen. Der Trainer sieht die Anfragen im privaten Panel.
 */
const suite = () =>
  runSuite("Spieler-Check", async ({ BASE, OUT, ctx, register, check, seen, sql, mailText, browser }) => {
    const phone = async () => (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
    // Technik voll (6 × 2), Taktik leer (6 × 0) = 12 Punkte = Mittel
    const answerAll = async (page) => {
      for (let i = 0; i < 12; i++) await page.locator("fieldset").nth(i).locator(`input[value="${i < 6 ? 2 : 0}"]`).check();
      await page.getByRole("button", { name: "Ergebnis anzeigen" }).click();
    };

    // Startseite: Check als Hauptweg, sichtbar ohne Scrollen
    const home = await phone();
    await home.goto(`${BASE}/`);
    const cta = home.getByRole("link", { name: "Kostenloser Spieler-Check" });
    const box = await cta.boundingBox();
    const vh = home.viewportSize()?.height ?? 0;
    check(!!box && box.y + box.height <= vh, "Startseite: Check-Knopf ohne Scrollen sichtbar");
    check(await seen(home.getByRole("heading", { name: "So funktioniert's" })), "Startseite: So funktioniert's");
    check(await seen(home.getByRole("link", { name: "Programme ansehen" })), "Startseite: Link zu den Programmen");
    check((await home.getByRole("heading", { name: "Für Trainer" }).count()) === 0 && (await home.getByText("Für Trainer").count()) === 0, "Startseite: kein Trainer-Block");
    await home.getByText("Ist ein Programm ein Abo?").tap();
    check(await seen(home.getByText("Es verlängert sich nichts automatisch")), "Startseite: FAQ klappt auf");
    await home.getByText("Was kostet ein Probetraining?").tap();
    check(await seen(home.getByText("CHF 30 für das Probetraining")), "Startseite: Preis Probetraining in der FAQ");
    const homeAxe = await new AxeBuilder({ page: home }).withTags(["wcag2a", "wcag2aa"]).analyze();
    check(homeAxe.violations.length === 0, `Startseite barrierefrei${homeAxe.violations.length ? `: ${homeAxe.violations.map((v) => v.id).join(", ")}` : ""}`);
    await cta.tap();
    await home.waitForURL("**/check");
    check(home.url().endsWith("/check"), "Startseite führt zum Spieler-Check");
    const robots = await (await home.request.get(`${BASE}/robots.txt`)).text();
    check(robots.includes("Disallow: /admin") && robots.includes("Disallow: /elternbereich"), "robots.txt schliesst private Bereiche aus");

    const p = await phone();
    await p.goto(`${BASE}/check`);
    check(p.url().endsWith("/check"), "Check öffnet ohne Login");
    check(await seen(p.getByRole("heading", { name: "Wie bleibt Ihr Kind in der Winterpause fit?" })), "Titel für die Werbung");
    check((await p.locator("fieldset").count()) === 12, "12 Fragen");
    await p.getByRole("button", { name: "Ergebnis anzeigen" }).click();
    check(await seen(p.getByText("Bitte beantworten Sie alle 12 Fragen (0 von 12 beantwortet).")), "Unvollständig: Hinweis statt Ergebnis");
    await answerAll(p);
    check(await seen(p.getByRole("heading", { name: "Niveau: Mittel" })), "Ergebnis: Niveau Mittel");
    check(await seen(p.getByText("12 von 24 Punkten · Technik 12/12 · Taktik 0/12")), "Punkte nach Technik und Taktik");
    check(await seen(p.locator("li", { hasText: "Schulterblick" })), "Trainingsfeld aus der Taktik genannt");
    check(await seen(p.getByText("+ 2 weitere")) && (await p.locator("li", { hasText: "Passen" }).count()) === 0, "Stärken gekürzt: 4 sichtbar, Rest zusammengefasst");
    check(await seen(p.getByText("Das Programm ist in Kürze verfügbar.")), "Ohne aktives Programm kein Kauf-Link");
    const wa = await p.getByRole("link", { name: "Probetraining per WhatsApp anfragen" }).getAttribute("href");
    check(wa?.startsWith("https://wa.me/41790000000?text=") && decodeURIComponent(wa).includes("Ergebnis: Mittel (12/24"), "WhatsApp-Nachricht mit Ergebnis");
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 1, "Handy: keine horizontale Überbreite");
    const axe = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    check(serious.length === 0, `Handy: WCAG AA${serious.length ? ` – ${serious.map((v) => v.id).join(", ")}` : ""}`);
    await p.screenshot({ path: `${OUT}/check-ergebnis-handy.png`, fullPage: true });

    // Kontaktdaten
    await p.getByRole("button", { name: "Feedback anfordern" }).click();
    check(await seen(p.getByText("Bitte Ihren Namen eingeben.")) && await seen(p.getByText("Bitte stimmen Sie der Kontaktaufnahme zu.")), "Kontakt: Pflichtfelder und Zustimmung geprüft");
    await p.fill("#lead-name", "Anna Muster");
    await p.fill("#lead-email", "Anna.Muster@Test.invalid");
    await p.fill("#lead-age", "11");
    await p.fill("#lead-position", "Stürmer");
    await p.fill("#lead-team", "FC Test D-Junioren");
    await p.getByRole("button", { name: "Feedback anfordern" }).click();
    check(await seen(p.getByText("Bitte stimmen Sie der Kontaktaufnahme zu.")), "Ohne Zustimmung nichts gespeichert");
    check(await p.inputValue("#lead-email") === "Anna.Muster@Test.invalid", "Eingaben bleiben erhalten");
    check(sql(`select count(*) from public.check_leads`) === "0", "Noch keine Anfrage gespeichert");
    await p.locator('input[name="consent"]').check();
    const tLead = Date.now();
    await p.getByRole("button", { name: "Feedback anfordern" }).click();
    check(await seen(p.getByText("Danke! Felipe meldet sich in den nächsten Tagen bei Ihnen.")), "Anfrage gesendet");
    const note = await mailText("trainer@flp.test", tLead);
    check(
      note.includes("E-Mail: anna.muster@test.invalid") && note.includes("Verein / Team: FC Test D-Junioren") && note.includes("Niveau: Mittel (12/24") && /Reply-To: anna\.muster@test\.invalid/i.test(note),
      "Trainer erhält E-Mail mit Kontakt und Ergebnis (Antwort geht an die Familie)",
    );
    check(sql(`select email || '|' || level || '|' || score || '|' || technik || '|' || child_age || '|' || team from public.check_leads`) === "anna.muster@test.invalid|mittel|12|12|11|FC Test D-Junioren", "Anfrage gespeichert, Ergebnis serverseitig berechnet");

    // Trainer-Panel
    const admin = await ctx();
    await register(admin, "Felipe Admin", "admin@flp.test");
    sql(`update public.user_roles set role='admin' where user_id=(select id from auth.users where email='admin@flp.test');`);
    await admin.goto(`${BASE}/admin/check`);
    check(await seen(admin.getByText("Anna Muster")) && await seen(admin.getByText("anna.muster@test.invalid")), "Panel zeigt die Anfrage");
    check(await seen(admin.getByText("Schwächen: Schulterblick", { exact: false })), "Panel zeigt die Schwächen");
    check(await seen(admin.getByText(`${BASE}/check`, { exact: false })), "Panel zeigt den Link zum Check");
    const pAxe = await new AxeBuilder({ page: admin }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const pSerious = pAxe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    check(pSerious.length === 0, `Panel: WCAG AA${pSerious.length ? ` – ${pSerious.map((v) => v.id).join(", ")}` : ""}`);
    await admin.getByRole("button", { name: "Anfrage löschen" }).click();
    check(await seen(admin.getByText("Noch keine Anfragen")), "Anfrage gelöscht");

    const parent = await ctx(true);
    await register(parent, "Beat Eltern", "eltern@flp.test");
    await parent.goto(`${BASE}/admin/check`);
    check(await parent.waitForURL(/\/(elternbereich|startseite)/, { timeout: 15000 }).then(() => true).catch(() => false), "Eltern: Panel nicht erreichbar");

    // Aktives Winterpause-Programm erscheint als Angebot
    sql(`insert into public.products (slug, title, price_cents, access_days, is_active) values ('winterpause-mittel', 'Winterpause-Programm · Mittel', 2900, null, true);`);
    const p2 = await phone();
    await p2.goto(`${BASE}/check`);
    await answerAll(p2);
    const offer = p2.getByRole("link", { name: "Programm ansehen – CHF 29.00" });
    check(await seen(offer) && (await offer.getAttribute("href")) === "/programme/winterpause-mittel", "Angebot passend zum Niveau mit Preis");
  });

export default suite;
