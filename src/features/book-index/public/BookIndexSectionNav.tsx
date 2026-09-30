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
    href: "/en-cok-satanlar/cok-satanlara-yeni-girenler",
    label: "Çok Satanlara Yeni Girenler",
  },
  {
    key: "risers",
    href: "/en-cok-satanlar/cok-satanlarda-yukselenler",
    label: "Çok Satanlarda Yükselenler",
  },
  {
    key: "everywhere",
    href: "/en-cok-satanlar/birden-fazla-listede-cok-satanlar",
    label: "Birden Fazla Listede Çok Satanlar",
  },
  {
    key: "long-sellers",
    href: "/en-cok-satanlar/uzun-suredir-cok-satanlar",
    label: "Uzun Süredir Çok Satanlar",
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
  showPrimary = true,
  showAnalysis = true,
}: {
  current: BookIndexSection;
  showPrimary?: boolean;
  showAnalysis?: boolean;
}) {
  const showBestsellerAnalysisNav =
    showAnalysis && current !== "new-releases" && current !== "global";

  return (
    <nav className={styles.sectionNavShell} aria-label="Kitap Endeksi bölümleri">
      {showPrimary ? <NavRow current={current} items={primaryItems} /> : null}
      {showBestsellerAnalysisNav ? (
        <NavRow current={current} items={analysisItems} secondary />
      ) : null}
    </nav>
  );
}
