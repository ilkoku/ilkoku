import Link from "next/link";
import {
  EducationMediaCollection,
  type EducationMediaCollectionAsset,
} from "@/components/content/EducationMediaCollection";
import {
  MediaLibraryWorkbench,
  type MediaWorkbenchAsset,
  type MediaWorkbenchInvalid,
} from "@/components/content/MediaLibraryWorkbench";
import { SiteStaticMediaInventory } from "@/components/content/SiteStaticMediaInventory";
import { requireCmsManager } from "@/lib/cms-access";
import { EDUCATION_VISUAL_SLOTS } from "@/lib/cms-education";
import { parseCmsMediaAssetMetadata } from "@/lib/cms-media";
import { getCmsMediaReferenceMap } from "@/lib/cms-media-references";
import { getCmsStaticMediaInventory } from "@/lib/cms-static-media";
import { GENRES } from "@/lib/genres";
import { prisma } from "@/lib/prisma";
import styles from "./MediaPage.module.css";

type MediaRow = {
  contentKey: string;
  valueJson: string;
  status: "draft" | "published" | "archived";
  updatedAt: Date;
};

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export const dynamic = "force-dynamic";

function queryString(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

const uploadErrors: Record<string, string> = {
  form: "Yükleme formu okunamadı.",
  dosya: "Lütfen bir dosya seçin.",
  boyut: "Dosya 3 MB sınırını aşıyor.",
  tip: "Bu dosya türü desteklenmiyor veya dosya imzası geçersiz.",
  okuma: "Dosya okunamadı.",
  kayit: "Dosya kaydedilemedi. Lütfen tekrar deneyin.",
  sinif: "Eğitim görseli için geçerli eser türü ve görsel slotu seçilmelidir.",
  kullanimda: "Bu medya yayındaki CMS içeriğinde kullanılıyor. Önce gerçek kullanım yerlerinden kaldırın veya başka bir medya ile değiştirin.",
  metadata: "Medya metadata kaydı bozuk veya geçerli URL içermiyor. Canlı referans güvenilir biçimde kontrol edilemediği için arşivleme durduruldu.",
};

export default async function MediaPage({ searchParams }: PageProps) {
  const access = await requireCmsManager("/icerik/medya");
  const query = (await searchParams) ?? {};
  const errorKey = queryString(query.hata);
  const uploaded = queryString(query.yuklendi) === "1";
  const initialSearch = queryString(query.q).slice(0, 120);
  const initialKind = queryString(query.tur);
  const initialUsage = queryString(query.kullanim);
  const educationFilters = {
    category: queryString(query.egitimKategori).slice(0, 120),
    genreSlug: queryString(query.egitimTur).slice(0, 100),
    slot: queryString(query.egitimSlot).slice(0, 40),
  };

  const staticMediaSections = await getCmsStaticMediaInventory();
  const staticMediaCount = staticMediaSections.reduce((sum, section) => sum + section.assets.length, 0);

  let rows: MediaRow[] | null = null;
  try {
    rows = await prisma.$queryRaw<MediaRow[]>`
      SELECT contentKey, valueJson, status, updatedAt
      FROM SiteContent
      WHERE namespace = 'media' AND status <> 'archived'
      ORDER BY updatedAt DESC
      LIMIT 500
    `;
  } catch {
    rows = null;
  }

  if (!rows) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading">
          <div><span>Medya & Eğitim</span><h1>Medya Merkezi</h1><p>Site dosyaları sayfalara göre görünür; CMS yükleme envanteri okunamadığında yanlış sıfır gösterilmez.</p></div>
          <div className="content-profile"><strong>{staticMediaCount} statik medya</strong><small>{staticMediaSections.length} sayfa / bölüm</small></div>
        </div>
        <SiteStaticMediaInventory sections={staticMediaSections} />
        <div className="content-panel" role="alert">
          <strong>CMS yükleme kayıtları okunamadı.</strong>
          <p>Statik site medyası yukarıda gösterilmeye devam ediyor. Veritabanı envanteri görülmeden yeni kayıt veya arşivleme işlemleri durduruldu.</p>
          <div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/medya">Tekrar dene</Link></div>
        </div>
      </section>
    );
  }

  const prepared = rows.map((row) => ({ row, asset: parseCmsMediaAssetMetadata(row.valueJson) }));
  const invalid: MediaWorkbenchInvalid[] = prepared
    .filter((item) => !item.asset)
    .map(({ row }) => ({ contentKey: row.contentKey, updatedAt: row.updatedAt.toISOString() }));
  const valid = prepared.flatMap(({ row, asset }) => asset ? [{ row, asset }] : []);
  const referenceMap = await getCmsMediaReferenceMap(valid.map((item) => item.asset.url)).catch(() => null);
  const referencesAvailable = Boolean(referenceMap);

  const assets: MediaWorkbenchAsset[] = valid.map(({ row, asset }) => ({
    contentKey: row.contentKey,
    updatedAt: row.updatedAt.toISOString(),
    title: asset.title ?? "",
    url: asset.url,
    altText: asset.altText ?? "",
    kind: asset.kind ?? "other",
    usage: asset.usage ?? "",
    notes: asset.notes ?? "",
    filename: asset.filename ?? "",
    mimeType: asset.mimeType ?? "",
    sizeBytes: Number(asset.sizeBytes ?? 0),
    storage: asset.storage ?? "",
    uploadedBy: asset.uploadedBy ?? "",
    references: referenceMap?.get(asset.url) ?? [],
  }));

  const educationAssets: EducationMediaCollectionAsset[] = valid
    .filter(({ asset }) => asset.collection === "education")
    .map(({ row, asset }) => ({
      contentKey: row.contentKey,
      title: asset.title ?? "",
      url: asset.url,
      filename: asset.filename ?? "",
      sizeBytes: Number(asset.sizeBytes ?? 0),
      category: asset.category ?? "",
      genreSlug: asset.genreSlug ?? "",
      slot: asset.slot ?? "",
      slotNumber: asset.slotNumber ?? "",
      folder: asset.folder ?? "",
      updatedAt: row.updatedAt.toISOString(),
    }));

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Medya & Eğitim</span>
          <h1>Medya Merkezi</h1>
          <p>Sitedeki gerçek statik dosyaları ve CMS yüklemelerini tek merkezde; sayfa, kullanım yeri ve eğitim koleksiyonuna göre yönet.</p>
        </div>
        <div className="content-profile">
          <strong>{staticMediaCount + assets.length} görünür medya</strong>
          <small>{staticMediaCount} statik · {assets.length} CMS yüklemesi · {educationAssets.length} eğitim yüklemesi</small>
        </div>
      </div>

      {!access.canPublish ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Medya arşivleme yayın yetkisi gerektirir.</strong><p>Dosya yükleme ve envanter yönetimi açık. Aktif medya URL&apos;sini kapatmak public içerikleri etkileyebileceği için arşivleme yalnız yayın yetkili kullanıcıya açıktır.</p></div> : null}
      {uploaded ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Dosya yüklendi.</strong> Yeni medya envantere eklendi.</div> : null}
      {errorKey && uploadErrors[errorKey] ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>İşlem tamamlanamadı:</strong> {uploadErrors[errorKey]}</div> : null}
      {invalid.length > 0 ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>{invalid.length} aktif medya metadata kaydı bozuk.</strong><p>Bu kayıtlar normal arşiv akışına sokulmaz. URL bilinmeden canlı referans kontrolü güvenilir değildir.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}
      {!referencesAvailable ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>CMS medya kullanım haritası doğrulanamadı.</strong><p>CMS yüklemeleri için “kullanımda değil” sonucu üretilmedi. Referans görünürlüğü geri gelene kadar arşivleme fail-closed olarak kilitlendi.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}

      <nav className={styles.viewNav} aria-label="Medya görünümleri">
        <a href="#site-medya"><span>Site Sayfaları</span><strong>{staticMediaCount}</strong></a>
        <a href="#egitim-medya"><span>Eğitim Yüklemeleri</span><strong>{educationAssets.length}</strong></a>
        <a href="#cms-medya"><span>CMS Yüklemeleri</span><strong>{assets.length}</strong></a>
      </nav>

      <SiteStaticMediaInventory sections={staticMediaSections} />

      <EducationMediaCollection
        assets={educationAssets}
        genres={GENRES.map((genre) => ({ slug: genre.slug, label: genre.label, category: genre.category }))}
        slots={EDUCATION_VISUAL_SLOTS.map((slot) => ({ key: slot.key, number: slot.number, label: slot.label }))}
        filters={educationFilters}
      />

      <section id="cms-medya" className={styles.generalSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span>CMS yüklemeleri</span>
            <h2>Yüklenen Medya</h2>
            <p>PC’den yüklenen dosyalar için arama, önizleme, gerçek kullanım takibi ve güvenli arşivleme.</p>
          </div>
          <div className={styles.sectionCount}><strong>{assets.length}</strong><span>aktif kayıt</span></div>
        </div>
        <MediaLibraryWorkbench
          assets={assets}
          invalid={invalid}
          referencesAvailable={referencesAvailable}
          canPublish={access.canPublish}
          initialSearch={initialSearch}
          initialKind={initialKind}
          initialUsage={initialUsage}
        />
      </section>
    </section>
  );
}
