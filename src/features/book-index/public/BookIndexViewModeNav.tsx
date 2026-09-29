import Link from "next/link";

import styles from "./BookIndexPublicView.module.css";

export function BookIndexViewModeNav({
  current,
}: {
  current: "list" | "comparison";
}) {
  return (
    <nav className={styles.viewModeNav} aria-label="En çok satanlar görünümü">
      <Link
        aria-current={current === "list" ? "page" : undefined}
        className={
          current === "list"
            ? `${styles.viewModeLink} ${styles.viewModeActive}`
            : styles.viewModeLink
        }
        href="/en-cok-satanlar/turkiye"
      >
        Tüm Liste
      </Link>
      <Link
        aria-current={current === "comparison" ? "page" : undefined}
        className={
          current === "comparison"
            ? `${styles.viewModeLink} ${styles.viewModeActive}`
            : styles.viewModeLink
        }
        href="/en-cok-satanlar/turkiye/karsilastirma"
      >
        Karşılaştırma
      </Link>
    </nav>
  );
}
