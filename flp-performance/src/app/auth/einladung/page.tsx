"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Einladungslinks von Supabase liefern die Session im URL-Fragment (#access_token=…),
 * das serverseitig nicht lesbar ist. Diese Seite übernimmt die Session und leitet
 * zur Passwortvergabe weiter.
 */
async function acceptInvitation(): Promise<boolean> {
  const query = new URLSearchParams(window.location.search);
  if (query.get("token_hash") || query.get("code")) {
    window.location.replace(`/auth/confirm${window.location.search}`);
    return new Promise(() => {}); // Weiterleitung läuft
  }
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const access_token = hash.get("access_token");
  const refresh_token = hash.get("refresh_token");
  // Tokens sofort aus der Adresszeile/History entfernen
  window.history.replaceState(null, "", window.location.pathname);
  if (!access_token || !refresh_token) return false;
  const { error } = await createClient().auth.setSession({ access_token, refresh_token });
  return !error;
}

export default function InvitationPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    acceptInvitation().then((ok) => (ok ? router.replace("/passwort-neu") : setFailed(true)));
  }, [router]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5">
      <Logo />
      {failed ? (
        <>
          <h1 className="mt-10 text-3xl font-extrabold">Link ungültig</h1>
          <p className="mt-3 text-mute">Der Einladungslink ist abgelaufen oder wurde bereits verwendet. Fordere über «Passwort vergessen» einen neuen Link an.</p>
          <ButtonLink href="/passwort-vergessen" className="mt-8">
            Neuen Link anfordern
          </ButtonLink>
        </>
      ) : (
        <p className="mt-10 text-mute" aria-live="polite">
          Einladung wird geprüft …
        </p>
      )}
    </main>
  );
}
