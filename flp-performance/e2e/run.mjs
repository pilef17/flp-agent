#!/usr/bin/env node
// Führt die E2E-Suiten aus. Vor jeder Suite wird der Test-Stack mit frischer DB neu gestartet.
// Aufruf: node e2e/run.mjs [suite …]   (Standard: alle)
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const here = new URL(".", import.meta.url).pathname;
const all = ["phase1-auth-eltern", "phase2-coaching", "phase3-entwicklung", "phase4-shop", "a11y-mobile"];
const selected = process.argv.slice(2).length ? process.argv.slice(2) : all;

function loadEnv() {
  const file = `${here}.run/e2e.env`;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

let failures = 0;
for (const name of selected) {
  if (!all.includes(name)) throw new Error(`Unbekannte Suite: ${name}`);
  execFileSync("bash", [`${here}stack/up.sh`], { stdio: ["ignore", "ignore", "inherit"] });
  loadEnv();
  const { default: suite } = await import(`./suites/${name}.mjs`);
  failures += await suite();
}
execFileSync("bash", [`${here}stack/down.sh`]);
console.log(failures ? `\n${failures} FEHLER` : "\nAlle E2E-Suiten bestanden");
process.exit(failures ? 1 : 0);
