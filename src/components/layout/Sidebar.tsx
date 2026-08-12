"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Brand } from "@/components/ui/Brand";
import { NavItem } from "@/components/ui/NavItem";
import {
  editorNavigationContent,
  navigationContent,
  readerNavigationContent,
  publisherNavigationContent,
} from "@/content";
import {
  editorNavigationItems,
  navigationItems,
  readerNavigationItems,
  publisherNavigationItems,
} from "@/lib/navigation";
import {
  setAdminPublisherRoleViewAction,
} from "@/features/admin-role-view/actions";
import {
  adminPublisherViewRoleLabels,
  adminPublisherViewRoles,
  type AdminPublisherViewRole,
} from "@/features/admin-role-view/config";
import styles from "@/features/admin-role-view/AdminRoleView.module.css";
import type { UserRole } from "@/features/auth/types";
import type {
  PublisherPermission,
} from "@/features/publisher-workspace/permissions";
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

  if (role === "reader" || role === "editor_pending") {
    return readerNavigationItems;
  }

  if (role === "publisher") {
    return publisherNavigationItems;
  }

  return navigationItems;
}

function ariaLabelForRole(role: UserRole) {
  if (role === "editor") {
    return editorNavigationContent.ariaLabel;
  }

  if (role === "reader" || role === "editor_pending") {
    return readerNavigationContent.ariaLabel;
  }

  if (role === "publisher") {
    return publisherNavigationContent.ariaLabel;
  }

  return navigationContent.ariaLabel;
}

function isHeading(
  node: NavigationNode,
): node is Extract<NavigationNode, { type: "heading" }> {
  return node.type === "heading";
}

function filterPublisherNavigation(
  nodes: readonly NavigationNode[],
  permissions: readonly PublisherPermission[],
) {
  const canDiscoverWorks = permissions.includes("discover_works");
  const canDiscoverAuthors = permissions.includes("discover_authors");
  const canUseLikes =
    permissions.includes("like_work") ||
    permissions.includes("like_author");
  const canUseFavorites =
    permissions.includes("favorite_work") ||
    permissions.includes("favorite_author");
  const canUseFollowing = permissions.includes("follow_author");
  const canViewSharedItems = permissions.includes("view_shared_items");
  const canUseEditorRequests =
    permissions.includes("request_editor_review") ||
    permissions.includes("view_editor_requests");
  const canUseDiscovery =
    canDiscoverWorks ||
    canDiscoverAuthors ||
    canUseLikes ||
    canUseFavorites ||
    canUseFollowing ||
    canViewSharedItems;

  return nodes.filter((node) => {
    if (isHeading(node)) {
      if (node.label === "KEŞİF") return canUseDiscovery;
      if (node.label === "EDİTORYAL") return canUseEditorRequests;
      return true;
    }

    if (node.href === "/yayinevi/kesfet/eserler") {
      return canDiscoverWorks;
    }

    if (node.href === "/yayinevi/kesfet/yazarlar") {
      return canDiscoverAuthors;
    }

    if (node.href === "/yayinevi/begenilerim") {
      return canUseLikes;
    }

    if (node.href === "/yayinevi/favorilerim") {
      return canUseFavorites;
    }

    if (node.href === "/yayinevi/takip-ettiklerim") {
      return canUseFollowing;
    }

    if (node.href === "/yayinevi/paylasilanlar") {
      return canViewSharedItems;
    }

    if (node.href === "/yayinevi/editor-talepleri") {
      return canUseEditorRequests;
    }

    return true;
  });
}

export function Sidebar({
  adminPublisherView = null,
  badges = {},
  publisherPermissions = [],
  role,
}: {
  adminPublisherView?: {
    publisherId: string;
    role: AdminPublisherViewRole;
  } | null;
  badges?: Record<string, string>;
  publisherPermissions?: readonly PublisherPermission[];
  role: UserRole;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuState, setMenuState] = useState({
    isOpen: false,
    pathname,
  });
  const [
    publisherRoleMenuState,
    setPublisherRoleMenuState,
  ] = useState({
    isOpen: pathname === "/yayinevi/uyeler",
    pathname,
  });

  const isOpen =
    menuState.pathname === pathname && menuState.isOpen;
  const isPublisherRoleMenuOpen =
    publisherRoleMenuState.pathname === pathname
      ? publisherRoleMenuState.isOpen
      : pathname === "/yayinevi/uyeler";

  const isPublisherWorkspace =
    pathname === "/yayinevi" ||
    (
      pathname.startsWith("/yayinevi/") &&
      !pathname.startsWith("/yayinevi/davet/")
    );

  const navigationRole: UserRole = isPublisherWorkspace
    ? "publisher"
    : role;

  const baseItems = navigationForRole(navigationRole);
  const items =
    navigationRole === "publisher"
      ? filterPublisherNavigation(
          baseItems,
          publisherPermissions,
        )
      : baseItems;
  const ariaLabel = ariaLabelForRole(navigationRole);

  function setMenuOpen(nextIsOpen: boolean) {
    setMenuState({
      isOpen: nextIsOpen,
      pathname,
    });
  }

  function closeMobileMenu() {
    setMenuOpen(false);
  }

  function togglePublisherRoleMenu() {
    setPublisherRoleMenuState({
      isOpen: !isPublisherRoleMenuOpen,
      pathname,
    });
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
                className={[
                  "sidebar__nav-item",
                  adminPublisherView &&
                  item.href === "/yayinevi/uyeler"
                    ? styles.sidebarRoleHost
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={`${item.href}-${item.label}`}
                onClick={closeMobileMenu}
              >
                <NavItem
                  {...item}
                  badge={
                    badges[item.href] ??
                    item.badge
                  }
                  active={
                    !item.disabled &&
                    isActiveRoute(pathname, searchParams, item.href)
                  }
                />

                {adminPublisherView &&
                item.href === "/yayinevi/uyeler" ? (
                  <>
                    <button
                      aria-controls="publisher-admin-role-menu"
                      aria-expanded={isPublisherRoleMenuOpen}
                      aria-label={
                        isPublisherRoleMenuOpen
                          ? "Görünüm rollerini kapat"
                          : "Görünüm rollerini aç"
                      }
                      className={styles.sidebarRoleToggle}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        togglePublisherRoleMenu();
                      }}
                      type="button"
                    >
                      <span aria-hidden="true">
                        {isPublisherRoleMenuOpen ? "⌄" : "›"}
                      </span>
                    </button>

                    <div
                      className={styles.sidebarRoleCollapse}
                      data-open={
                        isPublisherRoleMenuOpen
                          ? "true"
                          : undefined
                      }
                      id="publisher-admin-role-menu"
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      <div>
                        <div
                          className={
                            styles.sidebarRoleSwitcher
                          }
                        >
                          <span
                            className={
                              styles.sidebarRoleTitle
                            }
                          >
                            Admin görünüm rolü
                          </span>

                          {adminPublisherViewRoles.map(
                            (publisherRole) => (
                              <form
                                action={
                                  setAdminPublisherRoleViewAction
                                }
                                key={publisherRole}
                              >
                                <input
                                  name="publisherId"
                                  type="hidden"
                                  value={
                                    adminPublisherView.publisherId
                                  }
                                />
                                <input
                                  name="publisherRole"
                                  type="hidden"
                                  value={publisherRole}
                                />
                                <button
                                  className={
                                    styles.sidebarRoleChoice
                                  }
                                  data-current={
                                    adminPublisherView.role ===
                                    publisherRole
                                      ? "true"
                                      : undefined
                                  }
                                  type="submit"
                                >
                                  {
                                    adminPublisherViewRoleLabels[
                                      publisherRole
                                    ]
                                  }
                                </button>
                              </form>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
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
