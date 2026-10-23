// Gemeinsame Hilfsfunktionen der E2E-Suiten (Playwright ohne Test-Runner).
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
export const PW = "Sicheres-Passwort-123";

export function sql(query) {
  return execFileSync("psql", ["-X", "-At", process.env.E2E_DB_URL], { input: query }).toString().trim();
}

function decodeQuotedPrintable(s) {
  return s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/** Link aus der neuesten E-Mail an `to`, die nach `after` (ms) eingegangen ist. */
export async function mailLink(to, after) {
  const dir = process.env.E2E_MAILDIR;
  for (let i = 0; i < 60; i++) {
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => `${dir}/${f}`) : [];
    const hits = files
      .filter((f) => fs.statSync(f).mtimeMs > after)
      .map((f) => decodeQuotedPrintable(fs.readFileSync(f, "utf8")))
      .filter((m) => m.includes(to));
    if (hits.length) return hits.at(-1).match(/href="([^"]+)"/)[1].replace(/&amp;/g, "&");
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Keine E-Mail an ${to}`);
}

/** Startet eine Suite mit eigenem Browser und zählt Fehler. */
export async function runSuite(name, body) {
  const browser = await chromium.launch();
  const outDir = new URL("./.run/screenshots/", import.meta.url).pathname;
  fs.mkdirSync(outDir, { recursive: true });
  let failures = 0;
  const cspViolations = [];

  const check = (cond, label) => {
    console.log(`${cond ? "ok  " : "FAIL"} ${label}`);
    if (!cond) failures++;
  };
  const seen = (loc) => loc.first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  const ctx = async (mobile = false) => {
    const page = await (
      await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 900 } })
    ).newPage();
    // Jede CSP-Verletzung ist ein Fehler (die Policy darf die App nicht brechen)
    page.on("console", (m) => {
      if (m.type() === "error" && /Content Security Policy/i.test(m.text())) cspViolations.push(m.text());
    });
    return page;
  };
  const register = async (page, fullName, email) => {
    const t = Date.now();
    await page.goto(`${BASE}/registrieren`);
    await page.fill("#f-fullName", fullName);
    await page.fill("#f-email", email);
    await page.fill("#f-password", PW);
    await page.fill("#f-passwordConfirm", PW);
    await page.check("input[name=privacy]");
    await page.click("button[type=submit]");
    await page.getByText("Fast geschafft").waitFor();
    await page.goto(await mailLink(email, t));
    await page.waitForLoadState("networkidle");
  };
  const login = async (page, email, pw = PW) => {
    await page.goto(`${BASE}/login`);
    await page.fill("#f-email", email);
    await page.fill("#f-password", pw);
    await page.click("button[type=submit]");
    await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  };

  console.log(`\n=== ${name}`);
  try {
    await body({ BASE, PW, OUT: outDir, ctx, register, login, check, seen, sql, mailLink, browser });
  } catch (e) {
    failures++;
    console.log(`FAIL Abbruch: ${e instanceof Error ? e.message.split("\n")[0] : e}`);
  }
  check(cspViolations.length === 0, `Keine CSP-Verletzungen${cspViolations.length ? `: ${cspViolations[0].slice(0, 160)}` : ""}`);
  await browser.close();
  return failures;
}
