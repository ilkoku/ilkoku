"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./PublicAnnouncementBanner.module.css";

type Notice = { key: string; title: string; body: string; level: string };

const hiddenPrefixes = ["/icerik", "/admin", "/sistem-yonetimi"];

export function PublicAnnouncementBanner() {
  const pathname = usePathname();
  const [items, setItems] = useState<Notice[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/public-announcements", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (active) setItems(Array.isArray(payload.items) ? payload.items : []);
      })
      .catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, [pathname]);

  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix)) || items.length === 0) return null;

  return (
    <aside className={styles.stack} aria-label="Platform duyuruları">
      {items.map((item) => (
        <div className={`${styles.notice} ${styles[item.level] || styles.info}`} key={item.key}>
          <strong>{item.title}</strong>
          <span>{item.body}</span>
        </div>
      ))}
    </aside>
  );
}
