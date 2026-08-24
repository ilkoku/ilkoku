import Link from "next/link";
import type { ReactNode } from "react";

import "./public-hubs.css";

export function PublicHubShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="public-hub">
      <nav
        aria-label="Genel gezinme"
        className="public-hub__container public-hub__nav"
      >
        <Link href="/">İlkOku</Link>
        <div>
          <Link href="/eserler">Eserler</Link>
          <Link href="/eserler/yeni">Yeni</Link>
          <Link href="/eserler/guncellenen">Güncellenen</Link>
          <Link href="/yazarlar">Yazarlar</Link>
          <Link href="/turler">Türler</Link>
          <Link href="/rehber">Rehberler</Link>
        </div>
      </nav>

      {children}

      <footer className="public-hub__footer">
        <div className="public-hub__container">
          <strong>İlkOku</strong>
          <nav aria-label="Alt gezinme">
            <Link href="/eserler">Eserler</Link>
            <Link href="/yazarlar">Yazarlar</Link>
            <Link href="/turler">Türler</Link>
            <Link href="/rehber">Rehber</Link>
            <Link href="/yardim">Yardım</Link>
            <Link href="/yasal/gizlilik-politikasi">
              Gizlilik
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
