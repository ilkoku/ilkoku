"use client";

import { usePathname } from "next/navigation";
import { Brand } from "@/components/ui/Brand";
import { NavItem } from "@/components/ui/NavItem";
import { navigationContent } from "@/content";
import { navigationItems } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <Brand />
      <nav className="sidebar__nav" aria-label={navigationContent.ariaLabel}>
        {navigationItems.map((item) => (
          <NavItem key={item.label} {...item} active={!item.disabled && pathname === item.href} />
        ))}
      </nav>
      <p className="sidebar__edition">{navigationContent.edition}</p>
    </aside>
  );
}
