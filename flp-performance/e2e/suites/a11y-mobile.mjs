import { AxeBuilder } from "@axe-core/playwright";
import { runSuite } from "../lib.mjs";

/**
 * Alle Seiten je Rolle auf Handy (390 px) und Desktop (1366 px):
 * keine horizontale Überbreite, keine schweren WCAG-2.1-AA-Verstösse (axe-core).
 */
const suite = () =>
  runSuite("Barrierefreiheit & Mobile", async ({ BASE, ctx, register, check, sql }) => {
    // Daten über die UI-Registrierung + SQL (als Testdaten markiert)
    const adminDesk = await ctx();
    await register(adminDesk, "Felipe Admin", "admin@flp.test");
    const parentDesk = await ctx();
    await register(parentDesk, "Anna Beispiel", "eltern@flp.test");
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(new Date());
    const monday = (() => {
      const d = new Date(`${today}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      return d.toISOString().slice(0, 10);
    })();
    const playerId = sql(`
      update public.user_roles set role='admin' where user_id=(select id from auth.users where email='admin@flp.test');
      with p as (insert into public.players (first_name, last_name, birth_year, position, is_test_data) values ('Lio','Beispiel',2015,'Flügel',true) returning id),
           c as (insert into public.coach_player_links (coach_id, player_id) select (select id from auth.users where email='admin@flp.test'), id from p),
           g as (insert into public.guardian_player_links (guardian_id, player_id) select (select id from auth.users where email='eltern@flp.test'), id from p)
      select id from p;`).split("\n").at(-1);
    const adminId = sql(`select id from auth.users where email='admin@flp.test'`);
    sql(`
      insert into public.exercises (id, code, title, category, status, description, coaching_instructions, safety_notes, sets, repetitions)
        values ('20000000-0000-4000-8000-000000000001','TEC-001','Ballführung im Slalom','technik','published','Dribbling durch Hütchen.','Kopf hoch.','Abstand halten.',3,10);
      insert into public.training_plans (id, player_id, title, week_start, status) values ('30000000-0000-4000-8000-000000000001','${playerId}','Woche Technik','${monday}','published');
      insert into public.training_sessions (id, plan_id, scheduled_on, title) values ('31000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','${today}','Technik');
      insert into public.session_exercises (session_id, exercise_id, sets, repetitions) values ('31000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',3,10);
      insert into public.assessments (id, player_id, coach_id, kind, assessed_on, coach_notes) values
        ('40000000-0000-4000-8000-000000000001','${playerId}','${adminId}','initial','2026-08-01','Guter Start.'),
        ('40000000-0000-4000-8000-000000000002','${playerId}','${adminId}','regular','2026-10-01','');
      insert into public.assessment_scores (assessment_id, category_id, score) select '40000000-0000-4000-8000-000000000001', id, 2 from public.assessment_categories;
      insert into public.assessment_scores (assessment_id, category_id, score) select '40000000-0000-4000-8000-000000000002', id, case when position=8 then null else 3 end from public.assessment_categories;
      update public.assessments set status='published';
      insert into public.coach_feedback (player_id, author_id, title, body, status) values ('${playerId}','${adminId}','Starke Woche','Weiter so.','published');
      update public.products set is_active = true, description = 'Trainingspläne und Videos.' where slug = 'flp-training';
      insert into public.product_content (product_id, kind, title, body) select id, 'article', 'Lektion 1', 'Text' from public.products where slug='flp-training';
      insert into public.privacy_requests (requester_id, request_type, details) values ((select id from auth.users where email='eltern@flp.test'), 'export', 'Bitte Datenkopie.');
    `);
    const planId = "30000000-0000-4000-8000-000000000001";
    const assessmentId = "40000000-0000-4000-8000-000000000002";
    const productId = sql(`select id from public.products where slug='flp-training'`);

    const pages = {
      anonym: ["/", "/login", "/registrieren", "/passwort-vergessen", "/programme", "/programme/flp-training", "/datenschutz", "/impressum", "/agb"],
      eltern: ["/elternbereich", `/spieler/${playerId}`, "/trainingsplan", "/uebungen", "/uebungen/20000000-0000-4000-8000-000000000001", "/entwicklung", "/feedback", "/konto", "/meine-kaeufe", "/passwort-neu"],
      admin: ["/admin", "/admin/spieler", `/admin/spieler/${playerId}`, "/admin/uebungen", "/admin/uebungen/20000000-0000-4000-8000-000000000001", `/admin/plaene/${planId}`, "/admin/beurteilungen", `/admin/beurteilungen/${assessmentId}`, "/admin/produkte", `/admin/produkte/${productId}`, "/admin/bestellungen", "/admin/datenschutz"],
    };
    const sessions = { anonym: null, eltern: { email: "eltern@flp.test" }, admin: { email: "admin@flp.test" } };

    for (const [role, paths] of Object.entries(pages)) {
      for (const mobile of [true, false]) {
        const page = await ctx(mobile);
        if (sessions[role]) {
          await page.goto(`${BASE}/login`);
          await page.fill("#f-email", sessions[role].email);
          await page.fill("#f-password", "Sicheres-Passwort-123");
          await page.click("form button[type=submit]");
          await page.waitForURL((u) => !u.pathname.startsWith("/login"));
        }
        for (const path of paths) {
          const label = `${role} ${mobile ? "390px" : "1366px"} ${path.replace(/[0-9a-f-]{36}/g, ":id")}`;
          await page.goto(`${BASE}${path}`);
          await page.waitForLoadState("networkidle");
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          check(overflow <= 1, `${label}: keine horizontale Überbreite${overflow > 1 ? ` (+${overflow}px)` : ""}`);
          const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
          const serious = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
          check(
            serious.length === 0,
            `${label}: WCAG AA${serious.length ? ` – ${serious.map((v) => `${v.id} (${v.nodes.length}× z.B. ${v.nodes[0].target.join(" ")})`).join("; ")}` : ""}`,
          );
        }
      }
    }
  });

export default suite;
