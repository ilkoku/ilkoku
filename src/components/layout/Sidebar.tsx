"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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
import type {
  NavigationItem,
  NavigationNode,
} from "@/types/navigation";

function isActiveRoute(
  pathname: string,
  searchParams: { get(key: string): string | null; size: number },
  href: string,
) {
  if (href === "#") return false;

  const target = new URL(href, "https://ilkoku.local");
  const targetPath = target.pathname;
  const pathMatches =
    targetPath === "/"
      ? pathname === "/"
      : pathname === targetPath || pathname.startsWith(`${targetPath}/`);

  if (!pathMatches) return false;

  const targetEntries = Array.from(target.searchParams.entries());
  if (targetEntries.length > 0) {
    return targetEntries.every(
      ([key, value]) => searchParams.get(key) === value,
    );
  }

  return pathname !== targetPath || searchParams.size === 0;
}

function navigationForRole(role: UserRole): readonly NavigationNode[] {
  if (role === "editor") {
    return editorNavigationItems;
  }

  if (role === "reader") {
    return readerNavigationItems;
  }

  return navigationItems;
}

function ariaLabelForRole(role: UserRole) {
  if (role === "editor") {
    return editorNavigationContent.ariaLabel;
  }

  if (role === "reader") {
    return readerNavigationContent.ariaLabel;
  }

  return navigationContent.ariaLabel;
}

function isHeading(
  node: NavigationNode,
): node is Extract<NavigationNode, { type: "heading" }> {
  return node.type === "heading";
}

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuState, setMenuState] = useState({
    isOpen: false,
    pathname,
  });

  const isOpen =
    menuState.pathname === pathname && menuState.isOpen;

  const items = navigationForRole(role);
  const ariaLabel = ariaLabelForRole(role);

  function setMenuOpen(nextIsOpen: boolean) {
    setMenuState({
      isOpen: nextIsOpen,
      pathname,
    });
  }

  function closeMobileMenu() {
    setMenuOpen(false);
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

      <aside
        id="dashboard-sidebar"
        className="sidebar"
        data-open={isOpen || undefined}
      >
        <Brand />

        <nav
          className="sidebar__nav"
          aria-label={ariaLabel}
        >
          {items.map((node, index) => {
            if (isHeading(node)) {
              return (
                <p
                  className="sidebar__nav-heading"
                  key={`heading-${node.label}-${index}`}
                >
                  {node.label}
                </p>
              );
            }

            const item: NavigationItem = node;

            return (
              <div
                className="sidebar__nav-item"
                key={`${item.href}-${item.label}`}
                onClick={closeMobileMenu}
              >
                <NavItem
                  {...item}
                  active={
                    !item.disabled &&
                    isActiveRoute(pathname, searchParams, item.href)
                  }
                />
              </div>
            );
          })}
        </nav>

        <p className="sidebar__edition">
          {navigationContent.edition}
        </p>
      </aside>
    </>
  );
}
