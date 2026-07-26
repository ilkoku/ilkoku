"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/ui/Brand";
import { NavItem } from "@/components/ui/NavItem";
import {
  editorNavigationContent,
  navigationContent,
  readerNavigationContent,
} from "@/content";
import {
  editorNavigationItems,
  navigationItems,
  readerNavigationItems,
} from "@/lib/navigation";
import type { UserRole } from "@/features/auth/types";

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [menuState, setMenuState] = useState({ isOpen: false, pathname });
  const isOpen = menuState.pathname === pathname && menuState.isOpen;
  const items =
    role === "editor"
      ? [...readerNavigationItems, ...editorNavigationItems]
      : role === "reader"
        ? readerNavigationItems
        : navigationItems;
  const ariaLabel =
    role === "editor"
      ? `${readerNavigationContent.ariaLabel} ve ${editorNavigationContent.ariaLabel}`
      : role === "reader"
        ? readerNavigationContent.ariaLabel
        : navigationContent.ariaLabel;

  function setMenuOpen(nextIsOpen: boolean) {
    setMenuState({ isOpen: nextIsOpen, pathname });
  }

  return (
    <>
      <button
        className="sidebar-toggle"
        type="button"
        aria-controls="dashboard-sidebar"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Menüyü kapat" : "Menüyü aç"}
        onClick={() => setMenuOpen(!isOpen)}
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
        onClick={() => setMenuOpen(false)}
      />

      <aside id="dashboard-sidebar" className="sidebar" data-open={isOpen || undefined}>
        <Brand />
        <nav className="sidebar__nav" aria-label={ariaLabel}>
          {items.map((item) => (
            <NavItem
              key={`${item.href}-${item.label}`}
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
