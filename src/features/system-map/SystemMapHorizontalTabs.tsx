"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { systemMapNavigationItems } from "./navigation";

/**
 * Single canonical horizontal submenu for /harita and its 18 specialist pages.
 * The authenticated /harita layout mounts it once; no duplicated menu per page.
 */
export function SystemMapHorizontalTabs() {
  const pathname = usePathname();
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const strip = stripRef.current;
    const current = strip?.querySelector<HTMLAnchorElement>('[aria-current="page"]');
    if (!strip || !current) return;

    // Keep the active tab visible without moving the document vertically.
    const left = current.offsetLeft - strip.offsetLeft -
      (strip.clientWidth - current.clientWidth) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: "auto" });
  }, [pathname]);

  return (
    <nav className="system-map-horizontal-tabs" aria-label="Sistem haritası yatay alt menüsü">
      <div className="system-map-horizontal-tabs__scroll" ref={stripRef}>
        {systemMapNavigationItems.map((item) => {
          const active = pathname === item.href || pathname === `${item.href}/`;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className="system-map-horizontal-tabs__tab"
              data-active={active ? "true" : undefined}
              href={item.href}
              key={item.key}
              title={item.description}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
