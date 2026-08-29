import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  getLiveSeoVerification,
  type SeoSchemaType,
} from "@/lib/seo-live-verification";
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

function evidenceValue(state: Tone) {
  if (state === "ok") return "Canlı doğrulandı";
  if (state === "danger") return "Eksik";
  return "Doğrulanamadı";
}

function isOptionalSchemaWithoutSample(type: SeoSchemaType, route: string | null, detail: string) {
  if (route !== null) return false;
  if (type === "Book") return detail.includes("keşfe açık eser örneği bulunamadı");
  if (type === "ProfilePage") return detail.includes("public yazar örneği bulunamadı");
  if (type === "FAQPage") return detail.includes("Yayınlanmış SSS kaydı yok");
  return false;
}

async function StructuredDataAudit() {
  const live = await getLiveSeoVerification();
  const schemaTypes: SeoSchemaType[] = ["WebSite", "Book", "CollectionPage", "ProfilePage", "FAQPage", "BreadcrumbList"];
  const checks = schemaTypes.map((type) => {
    const check = live.structuredData[type];
    return {
      type,
      ...check,
      optionalWithoutSample: isOptionalSchemaWithoutSample(type, check.route, check.detail),
    };
  });
  const blockers = checks.filter((check) => !check.optionalWithoutSample && check.state === "danger").length;
  const warnings = checks.filter((check) => !check.optionalWithoutSample && check.state === "warn").length;
  const waitingForContent = checks.filter((check) => check.optionalWithoutSample).length;
  const verified = checks.filter((check) => check.state === "ok").length;
  const tone: Tone = blockers > 0 ? "danger" : warnings > 0 ? "warn" : "ok";

  return (
    <section className={styles.audit} aria-labelledby="seo-structured-title">
      <div className={styles.header}>
        <div className={styles.copy}><span>Structured Data · TR</span><h2 id="seo-structured-title">Yapısal Veri</h2><p>Schema.org sinyalleri canlı server HTML üzerinden doğrulanır. Yalnız gerçekten yayınlanmış içerik için beklenen schema kontrol edilir; henüz eser, yazar veya SSS örneği yoksa bu durum SEO hatası sayılmaz.</p></div>
        <span className={styles.status} data-state={tone}>{tone === "ok" ? "Temiz" : tone === "warn" ? "Kontrol" : "Eksik"}</span>
      </div>
      <div className={styles.grid}>
        {checks.map((check) => (
          <Card
            key={check.type}
            state={check.optionalWithoutSample ? "ok" : check.state}
            label={check.type}
            value={check.optionalWithoutSample ? "Örnek yok" : evidenceValue(check.state)}
            detail={check.optionalWithoutSample ? `${check.detail} Bu schema şu anda uygulanabilir değil ve SEO uyarısı sayılmıyor.` : check.detail}
          />
        ))}
      </div>
      <div className={styles.focus}><div><strong>Kontrol noktası</strong><p>{blockers > 0 ? `${blockers} schema tipi canlı HTML içinde beklenen kanıtı vermiyor.` : warnings > 0 ? `${warnings} uygulanabilir schema tipi canlı olarak doğrulanamadı; yeniden kontrol edin.` : waitingForContent > 0 ? `${verified} schema tipi canlı doğrulandı. ${waitingForContent} schema tipi için henüz uygun public içerik örneği yok; bunlar hata değildir.` : "Beklenen schema tiplerinin seçili canlı örnekleri doğrulandı."}</p></div><div className={styles.actions}><Link href="/" target="_blank">Ana Sayfa ↗</Link><Link href="/eserler" target="_blank">Keşfe açık eserler ↗</Link></div></div>
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
        AND (
          (contentKey LIKE 'legal:%' AND contentKey NOT LIKE 'legal:en:%')
          OR (contentKey LIKE 'guide:%' AND contentKey NOT LIKE 'guide:en:%')
          OR contentKey LIKE 'page:tr:%'
        )
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
          <Card state="ok" label="Kapsam" value={`${indexable.length} indexlenebilir CMS`} detail={`${pages.length - indexable.length} noindex CMS kayıt kalite tekrar analizinden ayrıldı; kod tabanlı public keşif rotaları teknik SEO ve canlı structured-data envanterinde ayrıca izlenir.`} />
          <Card state={warnings > 0 ? "warn" : "ok"} label="Kalite uyarısı" value={`${warnings}`} detail="Uzunluk ve tekrar sinyalleri editoryal uyarıdır; kritik metadata eksiklerinden ayrı tutulur." />
        </div>

        <div className={styles.focus}><div><strong>Metadata düzeltme kuyruğu</strong><p>{blockers > 0 ? `${blockers} kritik metadata alanı eksik. Önce title/description eksiklerini kapatın.` : warnings > 0 ? `${warnings} kalite uyarısı var. Tekrar ve SERP uzunluklarını gözden geçirin.` : "Indexlenebilir TR CMS sayfalarında metadata kalite uyarısı görünmüyor."}</p></div><div className={styles.actions}><Link href="/icerik/seo?sorun=title">Title kuyruğu →</Link><Link href="/icerik/seo?sorun=description">Description kuyruğu →</Link></div></div>
      </section>
      <StructuredDataAudit />
    </>
  );
}
