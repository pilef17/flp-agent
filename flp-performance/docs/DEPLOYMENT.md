# Deployment

## Supabase
1. Projekt anlegen (Region möglichst in Europa), `npx supabase link`, `npx supabase db push`.
2. Auth → URL Configuration: Site URL + Redirect URLs (`/auth/confirm`, `/auth/einladung`).
3. Auth → SMTP: eigenen Versand konfigurieren. Standard-E-Mail-Vorlagen funktionieren (PKCE-Links
   für Registrierung/Passwort, Fragment-Links für Einladungen). Vorlagen auf Deutsch übersetzen.
4. Ersten Admin per `supabase/scripts/grant-admin.sql` setzen.

## Vercel
Das Repository enthält im Stamm noch die bestehende `flp-agente.html` (mit `vercel.json`).
Für die neue App ein **separates Vercel-Projekt** anlegen mit *Root Directory* = `flp-performance`,
Framework = Next.js. Umgebungsvariablen aus `.env.example` setzen
(`SUPABASE_SECRET_KEY` nur als Server-Variable, nie mit `NEXT_PUBLIC_`).

## Checkliste
- [ ] `npm run typecheck && npm run lint && npm test && npm run test:db` grün
- [ ] Migrationen in Staging getestet, dann Produktion
- [ ] Punkte aus `SICHERHEIT-DATENSCHUTZ.md` erledigt
