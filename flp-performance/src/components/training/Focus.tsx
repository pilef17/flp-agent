import { FOCUS, isFocus, timeRange } from "@/lib/focus";

/** Farbiger Fokus-Chip, z.B. «Kraft». */
export function FocusBadge({ focus }: { focus: string | null | undefined }) {
  if (!isFocus(focus)) return null;
  const f = FOCUS[focus];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wider ${f.border} ${f.text}`}>
      {f.label}
    </span>
  );
}

/** Farbbalken am linken Rand einer Tageskarte. */
export function focusBarClass(focus: string | null | undefined): string {
  return isFocus(focus) ? FOCUS[focus].bar : "bg-line";
}

export function TimeLabel({ start, end }: { start: string | null | undefined; end: string | null | undefined }) {
  const label = timeRange(start, end);
  if (!label) return null;
  return <span className="text-xs tabular-nums text-mute">{label} Uhr</span>;
}
