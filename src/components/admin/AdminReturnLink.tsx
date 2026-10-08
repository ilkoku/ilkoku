import Link from "next/link";

import styles from "./AdminReturnLink.module.css";

export function AdminReturnLink() {
  return (
    <Link className={styles.link} href="/sistem-yonetimi">
      <span aria-hidden="true">←</span>
      <span>Genel Yönetim Paneline Dön</span>
    </Link>
  );
}
