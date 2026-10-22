import type { ReactNode } from "react";

export function Alert({ tone = "info", children }: { tone?: "info" | "success" | "error"; children: ReactNode }) {
  const styles = {
    info: "border-line text-mute",
    success: "border-ok/50 text-ok",
    error: "border-danger/50 text-danger",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-card border bg-ink/40 px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-mute">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "gold" | "ok" | "danger" }) {
  const styles = {
    neutral: "border-line text-mute",
    gold: "border-gold/50 text-gold",
    ok: "border-ok/50 text-ok",
    danger: "border-danger/50 text-danger",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wider ${styles}`}>{children}</span>;
}

export function PageHeader({ eyebrow, title, text, action }: { eyebrow?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-4xl font-extrabold sm:text-5xl">{title}</h1>
        {text && <p className="mt-3 max-w-2xl text-mute">{text}</p>}
      </div>
      {action}
    </header>
  );
}

export function FormMessage({ state }: { state?: { ok?: boolean; message?: string } }) {
  if (!state?.message) return null;
  return <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>;
}
