"use server";

import { after } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluate, isCompleteAnswers, leadNotification } from "@/lib/check";
import { notifyCoach } from "@/lib/mail";
import { publicEnv } from "@/lib/env";

export type LeadState = {
  ok?: boolean;
  message?: string;
  errors?: { parentName?: string; email?: string; childAge?: string; consent?: string };
  values?: { parentName: string; email: string; childAge: string; position: string; team: string };
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

const schema = z.object({
  parentName: z.string().transform(clean).pipe(z.string().min(2, "Bitte Ihren Namen eingeben.").max(80, "Höchstens 80 Zeichen.")),
  email: z.string().trim().toLowerCase().email("Bitte eine gültige E-Mail-Adresse eingeben.").max(254),
  childAge: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.coerce.number({ error: "Bitte eine Zahl eingeben." }).int().min(4, "Alter: 4 bis 20 Jahre.").max(20, "Alter: 4 bis 20 Jahre.").nullable(),
  ),
  position: z.string().transform(clean).pipe(z.string().max(40, "Höchstens 40 Zeichen.")),
  team: z.string().transform(clean).pipe(z.string().max(60, "Höchstens 60 Zeichen.")),
  consent: z.literal("on", { error: "Bitte stimmen Sie der Kontaktaufnahme zu." }),
  answers: z.string(),
  website: z.string().optional(), // Honeypot für Bots – Menschen sehen das Feld nicht
});

/** Speichert die Kontaktanfrage nach dem Check. Das Ergebnis wird auf dem Server neu berechnet. */
export async function submitLead(_: LeadState, formData: FormData): Promise<LeadState> {
  const raw = Object.fromEntries(formData);
  const text = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "");
  const values = { parentName: text("parentName"), email: text("email"), childAge: text("childAge"), position: text("position"), team: text("team") };
  const parsed = schema.safeParse({ ...values, consent: raw.consent ?? "", answers: text("answers"), website: text("website") });
  if (!parsed.success) {
    const errors: LeadState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<LeadState["errors"]>;
      if (key in { parentName: 1, email: 1, childAge: 1, consent: 1 }) errors[key] ??= issue.message;
    }
    return { errors, values };
  }
  // Bots füllen das versteckte Feld aus: so tun, als wäre alles gut
  if (parsed.data.website) return { ok: true };

  let answers: unknown;
  try {
    answers = JSON.parse(parsed.data.answers);
  } catch {
    answers = null;
  }
  if (!isCompleteAnswers(answers)) return { message: "Bitte beantworten Sie zuerst alle Fragen des Checks.", values };
  const r = evaluate(answers);

  const { error } = await createAdminClient().from("check_leads").insert({
    parent_name: parsed.data.parentName,
    email: parsed.data.email,
    child_age: parsed.data.childAge,
    position: parsed.data.position,
    team: parsed.data.team,
    level: r.level,
    score: r.score,
    technik: r.technik,
    taktik: r.taktik,
    answers,
    consent_at: new Date().toISOString(),
  });
  if (error) return { message: "Das hat leider nicht geklappt. Bitte versuchen Sie es später erneut.", values };
  // E-Mail an den Trainer erst nach der Antwort senden – die Familie wartet nicht auf den Mailserver
  const mail = leadNotification(parsed.data, r, publicEnv.siteUrl());
  after(() => notifyCoach({ ...mail, replyTo: parsed.data.email }));
  return { ok: true };
}
