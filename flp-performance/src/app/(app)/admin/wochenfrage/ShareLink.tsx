"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";

export function ShareLink({ url, message }: { url: string; message: string }) {
  const [copied, setCopied] = useState<"link" | "text" | null>(null);
  const copy = async (what: "link" | "text") => {
    try {
      await navigator.clipboard.writeText(what === "link" ? url : message);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };
  return (
    <div>
      <p className="break-all rounded-card border border-line bg-ink px-4 py-3 font-mono text-sm" data-testid="family-link">
        {url}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("primary")}
          data-testid="share-whatsapp"
        >
          Per WhatsApp teilen
        </a>
        <button type="button" onClick={() => copy("text")} className={buttonClass("secondary")}>
          {copied === "text" ? "Kopiert ✓" : "Nachricht kopieren"}
        </button>
        <button type="button" onClick={() => copy("link")} className={buttonClass("ghost")}>
          {copied === "link" ? "Kopiert ✓" : "Nur Link kopieren"}
        </button>
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-mute hover:text-paper">Nachricht ansehen</summary>
        <p className="mt-2 whitespace-pre-wrap rounded-card border border-line bg-ink px-4 py-3 text-sm" data-testid="family-message">
          {message}
        </p>
      </details>
    </div>
  );
}
