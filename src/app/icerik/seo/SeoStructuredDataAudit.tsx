import Link from "next/link";
import styles from "./SeoTechnicalAudit.module.css";

export function SeoStructuredDataAudit() {
  return (
    <section className={styles.audit} aria-labelledby="seo-structured-title">
      <div className={styles.header}>
        <div className={styles.copy}><span>Structured Data · TR</span><h2 id="seo-structured-title">Yapısal Veri</h2><p>Arama motorlarına site ve eser kimliği için verilen schema.org sinyallerini görün. Yalnız gerçekten mevcut ve doğrulanabilir veri tipleri kullanılır.</p></div>
        <span className={styles.status} data-state="ok">Hazır</span>
      </div>
      <div className={styles.grid}>
        <article className={styles.card} data-state="ok"><span>WebSite</span><strong>Site kimliği</strong><small>İlkOku adı, canonical site URL'si, TR dili ve marka açıklaması root server HTML içinde JSON-LD olarak yayınlanır.</small></article>
        <article className={styles.card} data-state="ok"><span>Book</span><strong>Eser detayları</strong><small>Public eser sayfalarında başlık, yazar, URL, dil, tür, görsel, yayın/güncelleme tarihi ve publisher sinyalleri Book JSON-LD ile verilir.</small></article>
        <article className={styles.card} data-state="ok"><span>Schema sınırı</span><strong>Uydurma tip yok</strong><small>Doğrulanamayan rating, review aggregate, SearchAction veya sahte Organization alanları üretilmez.</small></article>
      </div>
      <div className={styles.focus}><div><strong>Kontrol noktası</strong><p>Schema çıktıları public server HTML içinde bulunur; içerik verisi olmayan rich-result alanları sırf SEO puanı için doldurulmaz.</p></div><div className={styles.actions}><Link href="/" target="_blank">Ana Sayfa ↗</Link><Link href="/kesfet" target="_blank">Eserleri aç ↗</Link></div></div>
    </section>
  );
}
