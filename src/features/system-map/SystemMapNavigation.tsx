"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { systemMapNavigationGroups } from "./navigation";

export function SystemMapNavigation() {
  const pathname = usePathname();

  return (
    <aside className="system-map-primary-nav" aria-label="Harita çalışma masaları">
      <div className="system-map-primary-nav__brand">
        <Link href="/harita">İlkOku Harita</Link>
        <span>Operasyon kontrol merkezi</span>
      </div>

      <nav>
        {systemMapNavigationGroups.map((group) => (
          <section key={group.label}>
            <p>{group.label}</p>
            <div>
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    data-active={active ? "true" : undefined}
                    href={item.href}
                    key={item.href}
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

      <div className="system-map-primary-nav__footer">
        <Link href="/sistem-yonetimi">← Sistem Yönetimi</Link>
        <Link href="/sozlesme">Sözleşme Yönetimi</Link>
      </div>
    </aside>
  );
}
