# Deployment

## Supabase
1. Projekt anlegen (Region möglichst in Europa), `npx supabase link`, `npx supabase db push`.
2. Auth → URL Configuration: Site URL + Redirect URLs (`/auth/confirm`, `/auth/einladung`).
3. Auth → SMTP: eigenen Versand konfigurieren. Standard-E-Mail-Vorlagen funktionieren (PKCE-Links
   für Registrierung/Passwort, Fragment-Links für Einladungen). Vorlagen auf Deutsch übersetzen.
4. Ersten Admin per `supabase/scripts/grant-admin.sql` setzen.

## Stripe einrichten
1. Im Stripe-Dashboard zuerst im **Testmodus** arbeiten. API-Schlüssel `sk_test_…` als `STRIPE_SECRET_KEY` setzen.
2. Webhook-Endpunkt anlegen: `https://<domain>/api/stripe/webhook` mit den Events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
   Das Signing-Secret `whsec_…` als `STRIPE_WEBHOOK_SECRET` setzen.
3. Lokal: `stripe listen --forward-to localhost:3000/api/stripe/webhook` (Stripe CLI) und das angezeigte `whsec_…` verwenden.
4. Zahlungsmethoden (Karte, TWINT) unter *Settings → Payment methods* aktivieren. Checkout zeigt automatisch die aktivierten Methoden für CHF.
5. E-Mail-Quittungen unter *Settings → Emails* aktivieren (die App verweist darauf).
6. Testkauf mit Karte `4242 4242 4242 4242`, danach Rückerstattung im Dashboard → Zugang muss verschwinden.
7. Erst danach Live-Schlüssel setzen. `STRIPE_API_BASE` in Produktion **nie** setzen (nur für stripe-mock).

## Vercel
Das Repository enthält im Stamm noch die bestehende `flp-agente.html` (mit `vercel.json`).
Für die neue App ein **separates Vercel-Projekt** anlegen mit *Root Directory* = `flp-performance`,
Framework = Next.js. Umgebungsvariablen aus `.env.example` setzen
(`SUPABASE_SECRET_KEY` nur als Server-Variable, nie mit `NEXT_PUBLIC_`).

## Checkliste
- [ ] `npm run typecheck && npm run lint && npm test && npm run test:db` grün
- [ ] Migrationen in Staging getestet, dann Produktion
- [ ] Punkte aus `SICHERHEIT-DATENSCHUTZ.md` erledigt
