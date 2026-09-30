import Link from "next/link";

import styles from "./BookIndexPublicView.module.css";

export type BookIndexSection =
  | "overview"
  | "turkey"
  | "new-releases"
  | "global"
  | "comparison"
  | "new-entries"
  | "risers"
  | "everywhere"
  | "long-sellers";

const primaryItems: Array<{
  key: BookIndexSection;
  href: string;
  label: string;
}> = [
  { key: "overview", href: "/en-cok-satanlar", label: "En Çok Satanlar" },
  { key: "turkey", href: "/en-cok-satanlar/turkiye", label: "Türkiye" },
  { key: "new-releases", href: "/yeni-cikanlar", label: "Yeni Çıkanlar" },
  { key: "global", href: "/en-cok-satanlar/dunya", label: "Dünya" },
];

const analysisItems: Array<{
  key: BookIndexSection;
  href: string;
  label: string;
}> = [
  {
    key: "comparison",
    href: "/en-cok-satanlar/turkiye/karsilastirma",
    label: "Karşılaştırma",
  },
  {
    key: "new-entries",
    href: "/en-cok-satanlar/yeni-girisler",
    label: "Yeni Girişler",
  },
  {
    key: "risers",
    href: "/en-cok-satanlar/yukselenler",
    label: "Yükselenler",
  },
  {
    key: "everywhere",
    href: "/en-cok-satanlar/her-yerde-satanlar",
    label: "Her Yerde Satanlar",
  },
  {
    key: "long-sellers",
    href: "/en-cok-satanlar/uzun-satanlar",
    label: "Uzun Satanlar",
  },
];

function NavRow({
  current,
  items,
  secondary = false,
}: {
  current: BookIndexSection;
  items: Array<{
    key: BookIndexSection;
    href: string;
    label: string;
  }>;
  secondary?: boolean;
}) {
  return (
    <div
      className={
        secondary
          ? `${styles.sectionNav} ${styles.sectionNavSecondary}`
          : styles.sectionNav
      }
    >
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
    </div>
  );
}

export function BookIndexSectionNav({
  current,
}: {
  current: BookIndexSection;
}) {
  return (
    <nav className={styles.sectionNavShell} aria-label="Kitap Endeksi bölümleri">
      <NavRow current={current} items={primaryItems} />
      <NavRow current={current} items={analysisItems} secondary />
    </nav>
  );
}
