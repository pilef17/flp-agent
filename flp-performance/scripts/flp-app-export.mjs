#!/usr/bin/env node
// Exportiert die Positionsprogramme aus der Netlify-App (flp-app/index.html) in das Importformat
// des Shops (src/lib/programs.ts): pro Position ein Jugend- und ein Pro-Programm, Inhalte auf Deutsch.
//
// Aufruf: node scripts/flp-app-export.mjs ../flp-app/index.html [jugend|pro] > programme.json
// Mit «jugend» oder «pro» nur diese Stufe exportieren (je eine Datei bleibt unter dem Upload-Limit).
// Die erzeugte Datei enthält bezahlte Inhalte: nicht ins Repository einchecken.
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const PRICE = { jugend: 4900, pro: 6900 };
const ACCESS_DAYS = 183;
const POSITION_OFFSET = 10;

/** Datenkonstanten der App auswerten (eigener Code der App, nur die Datenblöcke ohne DOM-Logik). */
function loadData(html) {
  const lines = html.split("\n");
  const start = lines.findIndex((l) => l.startsWith("const CONFIG="));
  const end = lines.findIndex((l) => l.startsWith("const store="));
  if (start < 0 || end < start) throw new Error("Datenblock der App nicht gefunden (CONFIG … store).");
  const src = `${lines.slice(start, end).join("\n")}\n;({ UI, KU, MOD, PRO, POS_DE, ORDER })`;
  return vm.runInNewContext(src, { navigator: { language: "de" }, document: {}, window: {} }, { timeout: 5000 });
}

const strip = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const clip = (s, n) => {
  const t = strip(s);
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const opt = (s, n) => (strip(s) ? clip(s, n) : undefined);
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Übung im Format der Jugend-Module (n, d, s, p, i, mat, say, ok, bad, go, kid). */
function moduleExercise(e, md, { code, minutes, note } = {}) {
  const params = [e.s, e.i && `${md.ind}: ${e.i}`, e.go && `${md.go}: ${e.go}`].filter(Boolean).map((p) => clip(p, 200));
  return {
    ...(code ? { code: String(code) } : {}),
    name: clip(e.n, 160),
    description: clip(note ? `${strip(e.d)} — ${strip(note)}` : e.d, 2000),
    ...(minutes ? { minutes } : {}),
    params: params.slice(0, 12),
    ...(opt(e.kid, 500) ? { tip: `${md.kid}: ${clip(e.kid, 480)}` } : {}),
    ...(opt(e.p, 500) ? { progression: clip(e.p, 500) } : {}),
    ...(opt(e.mat, 120) ? { material: clip(e.mat, 120) } : {}),
    cues: (e.say ?? []).slice(0, 8).map((c) => clip(c, 160)),
    ...(opt(e.ok, 300) ? { success: clip(e.ok, 300) } : {}),
    ...(opt(e.bad, 300) ? { mistake: clip(e.bad, 300) } : {}),
  };
}

function jugendSessions(M, ku, md) {
  const out = [];
  M.weeks.forEach((week, wi) => {
    for (const slot of ["A", "B"]) {
      let s = week[slot];
      if (typeof s === "string") {
        const m = s.match(/=(\d+)([AB])/);
        if (!m) throw new Error(`Unbekannter Verweis ${s}`);
        s = M.weeks[Number(m[1])][m[2]];
      }
      const exercises = [moduleExercise(ku, md, { minutes: 3 })];
      for (const [kind, min, ref, note] of s.it) {
        if (kind === "ex") {
          const e = M.ex[ref];
          if (!e) throw new Error(`Übung ${ref} fehlt in ${M.title}`);
          exercises.push(moduleExercise(e, md, { code: ref, minutes: min, note }));
        } else {
          const section = { act: md.act, cool: md.cool, game: md.game }[kind] ?? kind;
          exercises.push({ section, name: clip(ref, 160), description: clip(note ?? "", 2000), minutes: min, params: [], cues: [] });
        }
      }
      out.push({
        title: clip(`Woche ${wi + 1} · ${slot}: ${s.n}`, 160),
        data: {
          level: "jugend",
          label: `Woche ${wi + 1} · Einheit ${slot}`,
          ...(opt(week.ph, 120) ? { phase: clip(week.ph, 120) } : {}),
          ...(opt(week.d, 400) ? { subtitle: clip(week.d, 400) } : {}),
          goals: [],
          ...(opt(M.rule, 600) ? { rule: `${md.rule}: ${clip(M.rule, 560)}` } : {}),
          exercises,
        },
      });
    }
  });
  return out;
}

function proSessions(list, lv) {
  return list.map((S, i) => ({
    title: clip(`Einheit ${i + 1}: ${S.t}`, 160),
    data: {
      level: "pro",
      label: `Pro · Einheit ${i + 1} von ${list.length}`,
      ...(lv.phases?.[S.phase - 1] ? { phase: `Phase ${S.phase} · ${lv.phases[S.phase - 1]}` } : {}),
      ...(opt(S.sub, 400) ? { subtitle: clip(S.sub, 400) } : {}),
      goals: (S.obj ?? []).slice(0, 6).map(([title, items]) => ({
        title: clip(title, 120),
        items: (items ?? []).slice(0, 12).map((x) => clip(x, 300)),
      })),
      rule: clip(lv.warn, 600),
      exercises: S.ex.slice(0, 30).map((e) => {
        const blocks = (e.blocks ?? []).map((b) => (typeof b === "string" ? b : JSON.stringify(b)));
        return {
          ...(opt(e.sec, 60) ? { section: clip(e.sec, 60) } : {}),
          ...(opt(e.id, 12) ? { code: clip(e.id, 12) } : {}),
          name: clip(e.n, 160),
          description: clip([e.d, ...blocks].filter(Boolean).join(" · "), 2000),
          ...(e.min ? { minutes: e.min } : {}),
          params: (e.params ?? []).slice(0, 12).map((p) => clip(p, 200)),
          ...(opt(e.tip, 500) ? { tip: clip(e.tip, 500) } : {}),
          cues: [],
        };
      }),
    },
  }));
}

export function exportPrograms(html, level) {
  const { UI, KU, MOD, PRO, POS_DE, ORDER } = loadData(html);
  const md = UI.de.md;
  const lv = UI.de.lv;
  const products = [];
  ORDER.forEach((key, i) => {
    const pos = POS_DE[key];
    const M = MOD.de[key];
    if (!pos || !M) return;
    const name = strip(pos.nome);
    const jugend = jugendSessions(M, KU.de, md);
    const jugendDescription = [strip(M.intro), strip(md.adult), M.rule ? `${md.rule}: ${strip(M.rule)}` : ""].filter(Boolean).join("\n\n");
    products.push({
      slug: `jugend-${slug(name)}`,
      title: `Jugend-Programm · ${name}`,
      summary: clip(`${strip(pos.lema)}. ${jugend.length} geführte Einheiten in 6 Wochen für ${strip(pos.art)}.`, 300),
      description: clip(jugendDescription, 5000),
      price_cents: PRICE.jugend,
      access_days: ACCESS_DAYS,
      position: POSITION_OFFSET + i * 2,
      sessions: jugend,
    });
    const pro = PRO.de?.[key];
    if (pro?.length) {
      const how = (lv.how ?? []).map((h) => `• ${strip(h)}`).join("\n");
      products.push({
        slug: `pro-${slug(name)}`,
        title: `Pro-Programm 17+ · ${name}`,
        summary: clip(`${strip(pos.lema)}. ${pro.length} Profi-Einheiten von Coach Felipe, inklusive Jugend-Programm.`, 300),
        description: clip(`${strip(lv.progD)}\n\n${how}\n\nInklusive Jugend-Programm: ${jugend.length} Einheiten in 6 Wochen.`, 5000),
        price_cents: PRICE.pro,
        access_days: ACCESS_DAYS,
        position: POSITION_OFFSET + i * 2 + 1,
        sessions: [...proSessions(pro, lv), ...jugend],
      });
    }
  });
  return { version: 1, products: level ? products.filter((p) => p.slug.startsWith(`${level}-`)) : products };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file, level] = process.argv.slice(2);
  if (!file || (level && !["jugend", "pro"].includes(level))) {
    console.error("Aufruf: node scripts/flp-app-export.mjs <pfad/zu/index.html> [jugend|pro]");
    process.exit(1);
  }
  process.stdout.write(JSON.stringify(exportPrograms(fs.readFileSync(file, "utf8"), level)));
}
