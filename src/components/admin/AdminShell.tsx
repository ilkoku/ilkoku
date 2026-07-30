"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { logoutAction } from "@/features/auth/actions";
import {
  adminNavigation,
  type AdminNavItem,
} from "@/lib/admin-navigation";

type AdminShellProps = {
  children: ReactNode;
  user: {
    email: string;
    fullName: string;
  };
};

function Icon({ name }: { name: AdminNavItem["icon"] }) {
  const paths: Record<AdminNavItem["icon"], ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    works: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22Z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22Z" />
      </>
    ),
    authors: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    editors: (
      <>
        <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10Z" />
        <path d="m14 7 3 3" />
      </>
    ),
    publishers: (
      <>
        <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-7h6v7" />
      </>
    ),
    applications: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    audit: (
      <>
        <path d="M12 22a10 10 0 1 0-10-10" />
        <path d="M2 4v6h6M12 6v6l4 2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21H9.6v-.08A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H3V9.6h.08A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V3h4v.08A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.16.37.37.7.6 1 .25.3.6.43 1 .4h.08v4H21a1.7 1.7 0 0 0-1.6.6Z" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function getInitials(fullName: string) {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("");

  return initials || "İK";
}

export function AdminShell({
  children,
  user,
}: AdminShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const initials = getInitials(user.fullName);

  return (
    <div className="admin-shell">
      <button
        type="button"
        className={`admin-backdrop ${open ? "is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-label="Menüyü kapat"
      />

      <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
        <div className="admin-brand">
          <Link href="/">
            <Image src={logo} alt="İlkOku" priority />
          </Link>
          <span>Yönetim Merkezi</span>
        </div>

        <nav aria-label="Yönetim menüsü">
          {adminNavigation.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "is-active" : ""}
                onClick={() => setOpen(false)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.badge && <b>{item.badge}</b>}
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar__footer">
          <span className="admin-status-dot" />
          Yönetici oturumu etkin
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-menu-button"
            onClick={() => setOpen(true)}
            aria-label="Menüyü aç"
          >
            ☰
          </button>

          <div>
            <p>İlkOku Admin</p>
            <strong>Kontrol Merkezi</strong>
          </div>

          <form action="/admin/eserler" className="admin-search" method="get">
            <span>⌕</span>
            <label className="sr-only" htmlFor="admin-global-search">
              Yönetim panelinde eser ara
            </label>
            <input
              id="admin-global-search"
              name="q"
              placeholder="Eser veya yazar ara..."
              type="search"
            />
          </form>

          <Link
            className="admin-icon-button"
            aria-label="Sistem hareketlerini görüntüle"
            href="/admin/audit-log"
          >
            ♢
          </Link>

          <div className="admin-profile">
            <span>{initials}</span>

            <div>
              <strong>{user.fullName}</strong>
              <small>{user.email}</small>
            </div>

            <Link className="admin-profile__logout" href="/hesabim">Hesabım</Link>

            <form action={logoutAction}>
              <button
                className="admin-profile__logout"
                type="submit"
                aria-label="Çıkış yap"
                title="Çıkış yap"
              >
                Çıkış
              </button>
            </form>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </section>
    </div>
  );
}
