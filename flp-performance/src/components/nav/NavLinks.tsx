"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/routes";

export function NavLinks({ items, mobile = false }: { items: NavItem[]; mobile?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));

  if (mobile) {
    const visible = items.filter((i) => !i.desktopOnly);
    return (
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}>
        {visible.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`flex min-h-14 items-center justify-center px-0.5 text-center text-[0.625rem] font-medium uppercase tracking-wide ${
                isActive(item.href) ? "text-gold" : "text-mute"
              }`}
            >
              {item.short ?? item.label}
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="flex items-center gap-7">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={`border-b py-1 text-sm transition-colors ${
              isActive(item.href) ? "border-gold text-paper" : "border-transparent text-mute hover:text-paper"
            }`}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
