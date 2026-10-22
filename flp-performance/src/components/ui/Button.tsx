import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex items-center justify-center gap-2 rounded-card px-5 py-3 text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 min-h-11";
const variants: Record<Variant, string> = {
  primary: "bg-gold text-ink hover:bg-gold-soft",
  secondary: "border border-line text-paper hover:border-gold hover:text-gold",
  ghost: "text-mute hover:text-paper",
  danger: "border border-danger/60 text-danger hover:bg-danger/10",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`;
}

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
