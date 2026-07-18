"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/ui/Brand";
import { NavItem } from "@/components/ui/NavItem";
import { navigationContent } from "@/content";
import { navigationItems } from "@/lib/navigation";

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        className="sidebar-toggle"
        type="button"
        aria-controls="dashboard-sidebar"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Menüyü kapat" : "Menüyü aç"}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      <button
        className="sidebar-backdrop"
        type="button"
        aria-label="Menüyü kapat"
        data-open={isOpen || undefined}
        onClick={() => setIsOpen(false)}
      />

      <aside id="dashboard-sidebar" className="sidebar" data-open={isOpen || undefined}>
        <Brand />
        <nav className="sidebar__nav" aria-label={navigationContent.ariaLabel}>
          {navigationItems.map((item) => (
            <NavItem
              key={item.label}
              {...item}
              active={!item.disabled && isActiveRoute(pathname, item.href)}
            />
          ))}
        </nav>
        <p className="sidebar__edition">{navigationContent.edition}</p>
      </aside>
    </>
  );
}
