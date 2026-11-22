import "server-only";
import nodemailer from "nodemailer";

/**
 * Versand von Benachrichtigungen an den Trainer über SMTP (z. B. Infomaniak).
 * Ohne SMTP_HOST oder LEAD_NOTIFY_TO wird nichts gesendet – die App funktioniert trotzdem.
 */
export function notifyConfig() {
  const host = process.env.SMTP_HOST;
  const to = process.env.LEAD_NOTIFY_TO;
  if (!host || !to) return null;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  return {
    to,
    from: process.env.SMTP_FROM ?? user ?? to,
    transport: {
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass: process.env.SMTP_PASS ?? "" } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    },
  };
}

/** Sendet eine Nachricht an den Trainer. Fehler werden protokolliert, nie an die Familie weitergegeben. */
export async function notifyCoach(msg: { subject: string; text: string; replyTo?: string }): Promise<boolean> {
  const cfg = notifyConfig();
  if (!cfg) return false;
  try {
    await nodemailer.createTransport(cfg.transport).sendMail({
      from: `FLP Performance <${cfg.from}>`,
      to: cfg.to,
      replyTo: msg.replyTo,
      subject: msg.subject,
      text: msg.text,
    });
    return true;
  } catch (e) {
    console.error("Benachrichtigung an den Trainer fehlgeschlagen:", e instanceof Error ? e.message : e);
    return false;
  }
}
