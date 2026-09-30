import Link from "next/link";

import styles from "./BookIndexPublicView.module.css";

type BookIndexSection =
  | "overview"
  | "turkey"
  | "new-releases"
  | "global";

const items: Array<{
  key: BookIndexSection;
  href: string;
  label: string;
}> = [
  { key: "overview", href: "/en-cok-satanlar", label: "En Çok Satanlar" },
  { key: "turkey", href: "/en-cok-satanlar/turkiye", label: "Türkiye" },
  { key: "new-releases", href: "/yeni-cikanlar", label: "Yeni Çıkanlar" },
  { key: "global", href: "/en-cok-satanlar/dunya", label: "Dünya" },
];

export function BookIndexSectionNav({
  current,
}: {
  current: BookIndexSection;
}) {
  return (
    <nav className={styles.sectionNav} aria-label="Kitap Endeksi bölümleri">
      {items.map((item) => (
        <Link
          aria-current={current === item.key ? "page" : undefined}
          className={
            current === item.key
              ? `${styles.sectionNavLink} ${styles.sectionNavActive}`
              : styles.sectionNavLink
          }
          href={item.href}
          key={item.key}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
