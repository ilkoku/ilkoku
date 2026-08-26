import Link from "next/link";
import type { ReactNode } from "react";

import "./public-hubs.css";

const discoveryLinks = [
  { href: "/eserler", label: "Tüm eserler" },
  { href: "/eserler/yeni", label: "Yeni yayımlananlar" },
  { href: "/eserler/guncellenen", label: "Son güncellenenler" },
  { href: "/yazarlar", label: "Yazarlar" },
  { href: "/turler", label: "Türler" },
] as const;

export function PublicHubShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="public-hub">
      <nav
        aria-label="Eser keşif sayfaları"
        className="public-hub__routes"
      >
        <div className="public-hub__container">
          {discoveryLinks.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {children}
    </div>
  );
}
