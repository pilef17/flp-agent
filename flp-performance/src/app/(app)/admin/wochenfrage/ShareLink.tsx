"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";

export function ShareLink({ url, message: custom }: { url: string; message?: string }) {
  const [copied, setCopied] = useState(false);
  const message = custom ?? `Hallo! Hier ist die Wochenfrage von FLP Performance – dein Kind braucht nur wenige Sekunden: ${url}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div>
      <p className="break-all rounded-card border border-line bg-ink px-4 py-3 font-mono text-sm" data-testid="family-link">
        {url}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={buttonClass("secondary")}>
          {copied ? "Kopiert ✓" : "Link kopieren"}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
          Per WhatsApp teilen
        </a>
        <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost")}>
          Vorschau öffnen
        </a>
      </div>
    </div>
  );
}
