import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./SeoTechnicalAudit.module.css";

type Row = {
  seoTitle: string | null;
  seoDescription: string | null;
  noIndex: boolean;
};
type Tone = "ok" | "warn" | "danger";

function normalized(value: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim().toLocaleLowerCase("tr-TR");
}

function duplicateCount(values: Array<string | null>) {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = normalized(raw);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0);
}

function Card({ state, label, value, detail }: { state: Tone; label: string; value: string; detail: string }) {
  return <article className={styles.card} data-state={state}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function StructuredDataAudit() {
  return (
    <section className={styles.audit} aria-labelledby="seo-structured-title">
      <div className={styles.header}>
        <div className={styles.copy}><span>Structured Data · TR</span><h2 id="seo-structured-title">Yapısal Veri</h2><p>Arama motorlarına verilen schema.org sinyallerini görün. Yalnız gerçekten mevcut ve doğrulanabilir veri tipleri kullanılır.</p></div>
        <span className={styles.status} data-state="ok">Hazır</span>
      </div>
      <div className={styles.grid}>
        <Card state="ok" label="WebSite" value="Site kimliği" detail="İlkOku adı, canonical site URL'si, TR dili ve marka açıklaması root server HTML içinde JSON-LD olarak yayınlanır." />
        <Card state="ok" label="Book" value="Eser detayları" detail="Public eserlerde başlık, yazar, URL, dil, tür, görsel, yayın/güncelleme tarihi ve publisher sinyalleri Book JSON-LD ile verilir." />
        <Card state="ok" label="Schema sınırı" value="Uydurma tip yok" detail="Doğrulanamayan rating, review aggregate veya benzeri alanlar sırf SEO puanı için üretilmez." />
      </div>
      <div className={styles.focus}><div><strong>Kontrol noktası</strong><p>Schema çıktıları public server HTML içindedir; veri olmayan rich-result alanları doldurulmaz.</p></div><div className={styles.actions}><Link href="/" target="_blank">Ana Sayfa ↗</Link><Link href="/kesfet" target="_blank">Eserleri aç ↗</Link></div></div>
    </section>
  );
}

export async function SeoMetadataQualityAudit() {
  let pages: Row[];
  try {
    pages = await prisma.$queryRaw<Row[]>`
      SELECT seoTitle, seoDescription, noIndex
      FROM ContentPage
      WHERE status = 'published'
        AND contentKey NOT LIKE 'legal:en:%'
        AND contentKey NOT LIKE 'guide:en:%'
        AND contentKey NOT LIKE 'page:en:%'
      ORDER BY updatedAt DESC
      LIMIT 5000
    `;
  } catch {
    return (
      <>
        <section className={styles.audit} role="alert">
          <div className={styles.header}><div className={styles.copy}><span>Metadata Kalitesi · TR</span><h2>SERP Kalite Kontrolü</h2><p>Published metadata okunamadı; tekrar ve uzunluk analizi durduruldu.</p></div><span className={styles.status} data-state="danger">Blokaj</span></div>
          <div className={styles.focus}><div><strong>Metadata kalite envanteri doğrulanamadı.</strong><p>Yanlış bir “kalite sorunu yok” sonucu üretilmiyor.</p></div><div className={styles.actions}><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div></div>
        </section>
        <StructuredDataAudit />
      </>
    );
  }

  const indexable = pages.filter((page) => !page.noIndex);
  const missingTitles = indexable.filter((page) => !page.seoTitle?.trim()).length;
  const missingDescriptions = indexable.filter((page) => !page.seoDescription?.trim()).length;
  const shortTitles = indexable.filter((page) => page.seoTitle?.trim() && page.seoTitle.trim().length < 25).length;
  const longTitles = indexable.filter((page) => page.seoTitle?.trim() && page.seoTitle.trim().length > 65).length;
  const shortDescriptions = indexable.filter((page) => page.seoDescription?.trim() && page.seoDescription.trim().length < 70).length;
  const longDescriptions = indexable.filter((page) => page.seoDescription?.trim() && page.seoDescription.trim().length > 170).length;
  const duplicateTitles = duplicateCount(indexable.map((page) => page.seoTitle));
  const duplicateDescriptions = duplicateCount(indexable.map((page) => page.seoDescription));
  const warnings = shortTitles + longTitles + shortDescriptions + longDescriptions + duplicateTitles + duplicateDescriptions;
  const blockers = missingTitles + missingDescriptions;
  const tone: Tone = blockers > 0 ? "danger" : warnings > 0 ? "warn" : "ok";

  return (
    <>
      <section className={styles.audit} aria-labelledby="seo-metadata-quality-title">
        <div className={styles.header}>
          <div className={styles.copy}><span>Metadata Kalitesi · TR</span><h2 id="seo-metadata-quality-title">SERP Kalite Kontrolü</h2><p>Eksik alanların yanında tekrar eden ve arama sonucunda zayıf görünebilecek aşırı kısa/uzun meta metinleri de izleyin. Uzunluk eşikleri kalite rehberidir; otomatik yayın blokajı değildir.</p></div>
          <span className={styles.status} data-state={tone}>{tone === "ok" ? "Temiz" : tone === "warn" ? "Kontrol" : "Eksik"}</span>
        </div>

        <div className={styles.grid}>
          <Card state={missingTitles > 0 ? "danger" : "ok"} label="SEO title" value={`${missingTitles} eksik`} detail={`${shortTitles} kısa · ${longTitles} uzun. Kalite rehberi: yaklaşık 25–65 karakter.`} />
          <Card state={missingDescriptions > 0 ? "danger" : "ok"} label="Meta description" value={`${missingDescriptions} eksik`} detail={`${shortDescriptions} kısa · ${longDescriptions} uzun. Kalite rehberi: yaklaşık 70–170 karakter.`} />
          <Card state={duplicateTitles > 0 ? "warn" : "ok"} label="Tekrar title" value={`${duplicateTitles} tekrar`} detail="Indexlenebilir sayfalarda aynı SEO title kullanımı ayrıştırmayı zayıflatabilir." />
          <Card state={duplicateDescriptions > 0 ? "warn" : "ok"} label="Tekrar description" value={`${duplicateDescriptions} tekrar`} detail="Aynı SERP açıklamasının çoklu sayfalarda kullanımı kontrol edilmelidir." />
          <Card state="ok" label="Kapsam" value={`${indexable.length} indexlenebilir`} detail={`${pages.length - indexable.length} noindex kayıt kalite tekrar analizinden ayrıldı.`} />
          <Card state={warnings > 0 ? "warn" : "ok"} label="Kalite uyarısı" value={`${warnings}`} detail="Uzunluk ve tekrar sinyalleri editoryal uyarıdır; kritik metadata eksiklerinden ayrı tutulur." />
        </div>

        <div className={styles.focus}><div><strong>Metadata düzeltme kuyruğu</strong><p>{blockers > 0 ? `${blockers} kritik metadata alanı eksik. Önce title/description eksiklerini kapatın.` : warnings > 0 ? `${warnings} kalite uyarısı var. Tekrar ve SERP uzunluklarını gözden geçirin.` : "Indexlenebilir TR sayfalarda metadata kalite uyarısı görünmüyor."}</p></div><div className={styles.actions}><Link href="/icerik/seo?sorun=title">Title kuyruğu →</Link><Link href="/icerik/seo?sorun=description">Description kuyruğu →</Link></div></div>
      </section>
      <StructuredDataAudit />
    </>
  );
}
