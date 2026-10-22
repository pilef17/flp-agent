import Link from "next/link";

export function ShopTabs({ active }: { active: "produkte" | "bestellungen" }) {
  const tab = (href: string, label: string, isActive: boolean) => (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`border-b-2 px-1 pb-3 text-sm ${isActive ? "border-gold text-paper" : "border-transparent text-mute hover:text-paper"}`}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Shop-Bereiche" className="-mt-4 mb-8 flex gap-6 border-b border-line">
      {tab("/admin/produkte", "Produkte", active === "produkte")}
      {tab("/admin/bestellungen", "Bestellungen & Zugänge", active === "bestellungen")}
    </nav>
  );
}
