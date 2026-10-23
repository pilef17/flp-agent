"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mediaPath } from "@/lib/exercises";
import { Alert } from "@/components/ui/Feedback";

/**
 * Direkter Upload vom Browser in einen Storage-Bucket (Policies prüfen die Rolle),
 * danach registriert eine Server-Action die Datei in der Datenbank.
 */
export function StorageUpload({
  bucket,
  folderId,
  accept,
  maxBytes,
  label,
  hint,
  withTitle = false,
  register,
}: {
  bucket: "product-covers" | "program-media" | "exercise-media";
  folderId: string;
  accept: readonly string[];
  maxBytes: number;
  label: string;
  hint: string;
  withTitle?: boolean;
  register: (path: string, title: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function upload(file: File) {
    setMsg(null);
    if (withTitle && title.trim().length < 2) return setMsg({ tone: "error", text: "Bitte zuerst einen Titel eingeben." });
    if (!accept.includes(file.type)) return setMsg({ tone: "error", text: "Dieses Dateiformat ist nicht erlaubt." });
    if (file.size > maxBytes) return setMsg({ tone: "error", text: `Die Datei ist grösser als ${Math.round(maxBytes / 1024 / 1024)} MB.` });
    setBusy(true);
    const path = mediaPath(folderId, file.name, crypto.randomUUID());
    const { error } = await createClient().storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      setBusy(false);
      return setMsg({ tone: "error", text: "Upload fehlgeschlagen. Bitte Dateigrösse und Verbindung prüfen." });
    }
    const res = await register(path, title.trim());
    setBusy(false);
    if (input.current) input.current.value = "";
    if (res.ok) setTitle("");
    setMsg(res.ok ? { tone: "success", text: "Hochgeladen." } : { tone: "error", text: res.message ?? "Fehler." });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {withTitle && (
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel des Videos" aria-label="Titel des Videos" maxLength={160} className="field" />
      )}
      <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-card border border-dashed border-line px-4 py-5 text-center text-sm hover:border-gold">
        <span className="font-semibold">{busy ? "Wird hochgeladen …" : label}</span>
        <span className="text-xs text-mute">{hint}</span>
        <input ref={input} type="file" accept={accept.join(",")} className="sr-only" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
    </div>
  );
}
