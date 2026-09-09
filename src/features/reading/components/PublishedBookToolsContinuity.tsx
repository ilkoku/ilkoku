import styles from "./PersonalReadingToolsProvider.module.css";

const cards = [
  ["▰", "Vurgula"],
  ["U", "Altını Çiz"],
  ["⌖", "İğne"],
  ["⌑", "Kaldığım Yer"],
  ["▱", "Not"],
  ["⌫", "Silgi"],
  ["≡", "İşaretlerim"],
] as const;

export function PublishedBookToolsContinuity() {
  return (
    <aside
      aria-label="Kişisel okuma araçları"
      className={styles.palette}
      data-compact="false"
      data-minimized="false"
      style={{ left: "18px", top: "150px" }}
    >
      <header className={styles.header}>
        <button
          aria-label="Araç kutusunu taşı"
          className={styles.dragHandle}
          disabled
          type="button"
        >
          ⋮⋮
        </button>

        <button className={styles.titleButton} disabled type="button">
          <span aria-hidden="true">✎</span>
          <span>
            <strong>Araçlar</strong>
            <small>Sadece sen görürsün</small>
          </span>
        </button>

        <button
          aria-label="Araçları küçült"
          className={styles.minimize}
          disabled
          type="button"
        >
          −
        </button>
      </header>

      <div className={styles.toolGrid}>
        {cards.map(([icon, label]) => (
          <button className={styles.toolCard} disabled key={label} type="button">
            <span aria-hidden="true">{icon}</span>
            <small>{label}</small>
          </button>
        ))}
      </div>

      <p aria-live="polite" className={styles.status} role="status">
        Kitap ek sayfası · okuma düzeni korunur. Kişisel işaretler bölüm sayfalarında kullanılabilir.
      </p>
    </aside>
  );
}
