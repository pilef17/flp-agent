import { publicEnv } from "@/lib/env";

export function coverUrl(path: string | null): string | null {
  return path ? `${publicEnv.supabaseUrl()}/storage/v1/object/public/product-covers/${path}` : null;
}

/** Titelbild oder ein ruhiger Platzhalter im Markendesign. */
export function ProductCover({ path, title, className = "" }: { path: string | null; title: string; className?: string }) {
  const url = coverUrl(path);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- öffentliches Storage-Bild, keine Optimierung nötig
    return <img src={url} alt="" className={`aspect-[16/10] w-full rounded-card object-cover ${className}`} />;
  }
  return (
    <div aria-hidden className={`flex aspect-[16/10] w-full items-end rounded-card border border-line bg-ink p-5 ${className}`}>
      <span className="font-display text-3xl font-black uppercase leading-none text-gold/80" style={{ fontStretch: "70%" }}>
        {title}
      </span>
    </div>
  );
}
