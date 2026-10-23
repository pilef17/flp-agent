"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MAX_VIDEO_BYTES, VIDEO_TYPES, mediaPath } from "@/lib/exercises";
import { Alert } from "@/components/ui/Feedback";
import { registerExerciseVideo } from "./actions";

/**
 * Lädt das Video direkt vom Browser in den privaten Bucket (grosse Dateien gehen
 * nicht über den Next.js-Server). Die Storage-Policy erlaubt das nur Trainern.
 */
export function VideoUpload({ exerciseId }: { exerciseId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function upload(file: File) {
    setMessage(null);
    if (!(VIDEO_TYPES as readonly string[]).includes(file.type)) {
      setMessage({ tone: "error", text: "Bitte ein Video im Format MP4, WebM oder MOV wählen." });
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setMessage({ tone: "error", text: "Das Video ist grösser als 500 MB." });
      return;
    }
    setBusy(true);
    const path = mediaPath(exerciseId, file.name, crypto.randomUUID());
    const { error } = await createClient()
      .storage.from("exercise-media")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      setBusy(false);
      setMessage({ tone: "error", text: "Upload fehlgeschlagen. Bitte Dateigrösse und Verbindung prüfen." });
      return;
    }
    const res = await registerExerciseVideo(exerciseId, path);
    setBusy(false);
    if (input.current) input.current.value = "";
    setMessage(res.ok ? { tone: "success", text: "Video hochgeladen." } : { tone: "error", text: res.message ?? "Fehler." });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-card border border-dashed border-line px-4 py-6 text-center text-sm hover:border-gold">
        <span className="font-semibold">{busy ? "Video wird hochgeladen …" : "Video auswählen"}</span>
        <span className="text-xs text-mute">MP4, WebM oder MOV · max. 500 MB · privat gespeichert</span>
        <input
          ref={input}
          type="file"
          accept={VIDEO_TYPES.join(",")}
          className="sr-only"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </label>
    </div>
  );
}
