export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse space-y-6">
      <span className="sr-only">Wird geladen …</span>
      <div className="h-3 w-32 rounded bg-graphite" />
      <div className="h-10 w-2/3 rounded bg-graphite" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 rounded bg-graphite" />
        <div className="h-28 rounded bg-graphite" />
        <div className="h-28 rounded bg-graphite" />
      </div>
      <div className="h-64 rounded bg-graphite" />
    </div>
  );
}
