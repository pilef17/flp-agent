import Link from "next/link";

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "md" | "lg" }) {
  const big = size === "lg";
  return (
    <Link href={href} className="inline-flex items-baseline gap-2 select-none">
      <span
        className={`font-display font-black tracking-tight text-paper ${big ? "text-4xl" : "text-xl"}`}
        style={{ fontStretch: "75%" }}
      >
        FLP
      </span>{" "}
      <span className={`font-medium uppercase tracking-[0.32em] text-gold ${big ? "text-sm" : "text-[0.625rem]"}`}>
        Performance
      </span>
      <span className="sr-only"> – zur Startseite</span>
    </Link>
  );
}
