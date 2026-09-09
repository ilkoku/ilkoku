import styles from "./PersonalReadingToolsProvider.module.css";

const cards = [
  {
    icon: "▰",
    label: "Vurgula",
    title: "Metni seç. Vurgu uygulanınca araç otomatik kapanır.",
  },
  {
    icon: "U",
    label: "Altını Çiz",
    title: "Metni seç. Alt çizgi uygulanınca araç otomatik kapanır.",
  },
  {
    icon: "⌖",
    label: "İğne",
    title: "Kitap sayfasında istediğin noktaya bir kez tıkla veya dokun.",
  },
  {
    icon: "⌑",
    label: "Kaldığım Yer",
    title: "Kaldığın noktaya bir kez tıkla veya dokun; eski konumun yenilenir.",
  },
  {
    icon: "▱",
    label: "Not",
    title: "Not bağlamak istediğin metni seç; kaydedince küçük not işareti görünür.",
  },
  {
    icon: "⌫",
    label: "Silgi",
    title: "Kişisel işaretlere tıkla; varsa eski çizgilerin üzerinden sürükle.",
  },
  {
    icon: "≡",
    label: "İşaretlerim",
    title: "Kişisel işaretlerini görüntüle.",
  },
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
        {cards.map(({ icon, label, title }) => (
          <button
            aria-expanded={label === "İşaretlerim" ? false : undefined}
            className={styles.toolCard}
            disabled
            key={label}
            title={title}
            type="button"
          >
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
