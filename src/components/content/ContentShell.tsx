"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { contentNavigation } from "@/lib/content-navigation";

type ContentShellProps = {
  children: ReactNode;
  user: { email: string; fullName: string };
};

export function ContentShell({ children, user }: ContentShellProps) {
  const pathname = usePathname();

  return (
    <div className="content-shell">
      <aside className="content-sidebar">
        <div className="content-brand">
          <Link href="/" aria-label="İlkOku ana sayfa">
            <Image src={logo} alt="İlkOku" priority />
          </Link>
          <span>İçerik Yönetimi</span>
        </div>

        <nav aria-label="İçerik yönetimi menüsü">
          {contentNavigation.map((item) => {
            const active = item.href === "/icerik"
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link key={item.href} href={item.href} className={active ? "is-active" : ""}>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </Link>
            );
          })}
        </nav>

        <div className="content-sidebar__footer">
          <Link href="/">Siteye Dön</Link>
          <Link href="/hesabim">Hesabım</Link>
        </div>
      </aside>

      <section className="content-main">
        <header className="content-topbar">
          <div>
            <p>İlkOku</p>
            <strong>İçerik Yönetim Merkezi</strong>
          </div>
          <div className="content-profile">
            <strong>{user.fullName}</strong>
            <small>{user.email}</small>
          </div>
        </header>
        <main className="content-area">{children}</main>
      </section>
    </div>
  );
}
