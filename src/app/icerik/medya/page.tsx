import Link from "next/link";
import {
  MediaLibraryWorkbench,
  type MediaWorkbenchAsset,
  type MediaWorkbenchInvalid,
} from "@/components/content/MediaLibraryWorkbench";
import { requireCmsManager } from "@/lib/cms-access";
import { parseCmsMediaAssetMetadata } from "@/lib/cms-media";
import { getCmsMediaReferenceMap } from "@/lib/cms-media-references";
import { prisma } from "@/lib/prisma";

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
          <div><span>İçerik</span><h1>Medya Kütüphanesi</h1><p>Medya envanteri doğrulanamadığında yükleme veya arşivleme kararı verilmez.</p></div>
        </div>
        <div className="content-panel" role="alert">
          <strong>Medya kayıtları okunamadı.</strong>
          <p>Bu durum medya kaydı olmadığı anlamına gelmez. Envanter görülmeden yeni kayıt veya arşivleme işlemleri durduruldu.</p>
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

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>İçerik</span>
          <h1>Medya Kütüphanesi</h1>
          <p>Dosyayı seç, önizle, gerçek kullanım yerlerini gör ve yalnız güvenli olduğunda arşivle.</p>
        </div>
        <div className="content-profile">
          <strong>{assets.length} aktif medya</strong>
          <small>{invalid.length} bozuk metadata · {access.canPublish ? "Yönet + güvenli arşiv" : "Yönetim yetkisi"}</small>
        </div>
      </div>

      {!access.canPublish ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Medya arşivleme yayın yetkisi gerektirir.</strong><p>Dosya yükleme ve envanter yönetimi açık. Aktif medya URL&apos;sini kapatmak public içerikleri etkileyebileceği için arşivleme yalnız yayın yetkili kullanıcıya açıktır.</p></div> : null}
      {uploaded ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Dosya yüklendi.</strong> Yeni medya envantere eklendi.</div> : null}
      {errorKey && uploadErrors[errorKey] ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>İşlem tamamlanamadı:</strong> {uploadErrors[errorKey]}</div> : null}
      {invalid.length > 0 ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>{invalid.length} aktif medya metadata kaydı bozuk.</strong><p>Bu kayıtlar normal arşiv akışına sokulmaz. URL bilinmeden canlı referans kontrolü güvenilir değildir.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}
      {!referencesAvailable ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Medya kullanım haritası doğrulanamadı.</strong><p>Kullanımda değil sonucu üretilmedi. Referans görünürlüğü geri gelene kadar tüm arşivleme aksiyonları fail-closed olarak kilitlendi.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}

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
  );
}
