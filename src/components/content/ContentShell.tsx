"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { contentNavigation } from "@/lib/content-navigation";

const groupOrder = ["Site", "İçerik", "Büyüme", "Sistem"] as const;

type ContentShellProps = {
  children: ReactNode;
  user: { email: string; fullName: string };
  isAdmin: boolean;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function ContentShell({ children, user, isAdmin }: ContentShellProps) {
  const pathname = usePathname();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigation = contentNavigation.filter((item) => isAdmin || !item.adminOnly);
  const currentItem = navigation
    .filter((item) => item.href !== "/icerik" && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]
    ?? navigation.find((item) => item.href === "/icerik");

  const groups = groupOrder
    .map((group) => ({ group, items: navigation.filter((item) => item.group === group) }))
    .filter((section) => section.items.length > 0);

  useEffect(() => {
    if (pathname === "/icerik/arama") {
      const query = new URLSearchParams(window.location.search).get("q") ?? "";
      if (searchInputRef.current) searchInputRef.current.value = query.slice(0, 120);
    }
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isSearchShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isSearchShortcut) {
        if (isEditableTarget(event.target) && event.target !== searchInputRef.current) return;
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (event.key === "Escape" && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
          {isAdmin && (
            <Link href="/sistem-yonetimi">Sistem Yönetimine Dön</Link>
          )}
          <Link href="/">Siteye Dön</Link>
          <Link href="/hesabim">Hesabım</Link>
        </div>
      </aside>

      <section className="content-main">
        <header className="content-topbar">
          <div className="content-topbar__context">
            <p>{currentItem?.group ?? "İlkOku"}</p>
            <strong>{currentItem?.label ?? "İçerik Yönetim Merkezi"}</strong>
            <small className="content-topbar__description">
              {currentItem?.description ?? "İlkOku site içerik yönetim merkezi"}
            </small>
          </div>

          <form className="content-global-search" action="/icerik/arama" method="get" role="search">
            <label htmlFor="cms-global-search">İçerik ara</label>
            <div className="content-global-search__control">
              <input
                ref={searchInputRef}
                id="cms-global-search"
                name="q"
                type="search"
                minLength={2}
                maxLength={120}
                placeholder="Sayfa, SSS, rehber, medya…"
                autoComplete="off"
                aria-label="CMS içinde içerik ara"
                aria-keyshortcuts="Meta+K Control+K"
              />
              <kbd aria-hidden="true">⌘K / Ctrl K</kbd>
              <button type="submit">Ara</button>
            </div>
          </form>

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
