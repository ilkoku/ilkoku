"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { contentNavigation } from "@/lib/content-navigation";

const groupOrder = ["Site", "İçerik", "Büyüme", "Sistem"] as const;

type ContentShellProps = {
  children: ReactNode;
  user: { email: string; fullName: string };
  isAdmin: boolean;
};

export function ContentShell({ children, user, isAdmin }: ContentShellProps) {
  const pathname = usePathname();
  const navigation = contentNavigation.filter((item) => isAdmin || !item.adminOnly);
  const currentItem = navigation
    .filter((item) => item.href !== "/icerik" && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]
    ?? navigation.find((item) => item.href === "/icerik");

  const groups = groupOrder
    .map((group) => ({ group, items: navigation.filter((item) => item.group === group) }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="content-shell">
      <a className="content-skip-link" href="#icerik-ana">İçeriğe geç</a>

      <aside className="content-sidebar" aria-label="İçerik yönetimi gezinmesi">
        <div className="content-brand">
          <Link href="/" aria-label="İlkOku ana sayfa">
            <Image src={logo} alt="İlkOku" priority />
          </Link>
          <span>İçerik Yönetimi</span>
        </div>

        <nav aria-label="İçerik yönetimi menüsü">
          {groups.map((section) => (
            <section className="content-nav-group" aria-labelledby={`cms-nav-${section.group}`} key={section.group}>
              <span className="content-nav-group__title" id={`cms-nav-${section.group}`}>{section.group}</span>
              <div className="content-nav-group__links">
                {section.items.map((item) => {
                  const active = item.href === "/icerik"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={active ? "is-active" : ""}
                      aria-current={active ? "page" : undefined}
                    >
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="content-sidebar__footer">
          <Link href="/">Siteye Dön</Link>
          <Link href="/hesabim">Hesabım</Link>
        </div>
      </aside>

      <section className="content-main">
        <header className="content-topbar">
          <div>
            <p>{currentItem?.group ?? "İlkOku"}</p>
            <strong>{currentItem?.label ?? "İçerik Yönetim Merkezi"}</strong>
            <small className="content-topbar__description">
              {currentItem?.description ?? "İlkOku site içerik yönetim merkezi"}
            </small>
          </div>
          <div className="content-profile">
            <strong>{user.fullName}</strong>
            <small>{user.email}</small>
          </div>
        </header>
        <main id="icerik-ana" className="content-area" tabIndex={-1}>{children}</main>
      </section>
    </div>
  );
}
