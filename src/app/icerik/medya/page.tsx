import Image from "next/image";
import Link from "next/link";
import { CopyMediaUrlButton } from "@/components/content/CopyMediaUrlButton";
import { archiveMediaAssetAction, createMediaAssetAction } from "@/features/cms/media-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";

type MediaRow = {
  contentKey: string;
  valueJson: string;
  status: "draft" | "published" | "archived";
  updatedAt: Date;
};

type MediaAsset = {
  id?: string;
  title?: string;
  url?: string;
  altText?: string;
  kind?: string;
  usage?: string;
  notes?: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  storage?: string;
  uploadedBy?: string;
};

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export const dynamic = "force-dynamic";

function formatBytes(input?: number) {
  const bytes = Number(input ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function parseAsset(valueJson: string): MediaAsset | null {
  try {
    const value = JSON.parse(valueJson) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const asset = value as MediaAsset;
    if (typeof asset.url !== "string" || !asset.url.startsWith("/") || asset.url.startsWith("//")) return null;
    return asset;
  } catch {
    return null;
  }
}

const uploadErrors: Record<string, string> = {
  form: "Yükleme formu okunamadı.",
  dosya: "Lütfen bir dosya seçin.",
  boyut: "Dosya 3 MB sınırını aşıyor.",
  tip: "Bu dosya türü desteklenmiyor veya dosya imzası geçersiz.",
  okuma: "Dosya okunamadı.",
  kayit: "Dosya kaydedilemedi. Lütfen tekrar deneyin.",
  kullanimda: "Bu medya yayındaki CMS içeriğinde kullanılıyor. Önce ilgili canlı içerikten kaldırın veya başka bir medya ile değiştirin.",
  metadata: "Medya metadata kaydı bozuk veya geçerli URL içermiyor. Canlı referans güvenilir biçimde kontrol edilemediği için arşivleme durduruldu.",
};

export default async function MediaPage({ searchParams }: PageProps) {
  const access = await requireCmsManager("/icerik/medya");
  const query = (await searchParams) ?? {};
  const errorKey = typeof query.hata === "string" ? query.hata : "";
  const uploaded = query.yuklendi === "1";

  let rows: MediaRow[] | null = null;
  try {
    rows = await prisma.$queryRaw<MediaRow[]>`
      SELECT contentKey, valueJson, status, updatedAt
      FROM SiteContent
      WHERE namespace = 'media' AND status <> 'archived'
      ORDER BY updatedAt DESC
      LIMIT 200
    `;
  } catch {
    rows = null;
  }

  if (!rows) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>İçerik</span><h1>Medya Kütüphanesi</h1><p>Medya envanteri doğrulanamadığında yükleme veya arşivleme kararı verilmez.</p></div></div>
        <div className="content-panel" role="alert"><strong>Medya kayıtları okunamadı.</strong><p>Bu durum “medya kaydı yok” anlamına gelmez. Envanter görülmeden yeni kayıt veya arşivleme işlemleri durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/medya">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const prepared = rows.map((row) => ({ row, asset: parseAsset(row.valueJson) }));
  const invalid = prepared.filter((item) => !item.asset);
  const assets = prepared.flatMap(({ row, asset }) => asset ? [{ ...row, asset }] : []);

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>İçerik</span><h1>Medya Kütüphanesi</h1><p>Görsel ve dokümanları gerçekten yükleyin; önizleme, alt metin, kullanım alanı ve kalıcı URL bilgisini tek merkezden yönetin.</p></div>
        <div className="content-profile"><strong>{assets.length} aktif medya</strong><small>{invalid.length} bozuk metadata · {access.canPublish ? "Yönet + arşiv yetkisi" : "Yönetim yetkisi"}</small></div>
      </div>

      {!access.canPublish ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Medya arşivleme yayın yetkisi gerektirir.</strong><p>Yeni dosya yükleyebilir ve kütüphaneyi yönetebilirsiniz. Aktif bir medya URL&apos;sini kapatmak public içerikleri etkileyebileceği için arşivleme yalnız yayın yetkili kullanıcıya açıktır.</p></div> : null}
      {uploaded ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Dosya yüklendi.</strong> Kalıcı medya URL&apos;si aşağıdaki kütüphaneye eklendi.</div> : null}
      {errorKey && uploadErrors[errorKey] ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>İşlem tamamlanamadı:</strong> {uploadErrors[errorKey]}</div> : null}
      {invalid.length > 0 ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>{invalid.length} aktif medya metadata kaydı bozuk.</strong><p>Bu kayıtlar normal arşiv akışına sokulmaz. URL bilinmeden canlı referans kontrolü güvenilir değildir.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}

      <div className="content-panel">
        <h2>Yeni dosya yükle</h2><p className="content-form-help">JPEG, PNG, WebP, GIF, AVIF, ICO veya PDF · en fazla 3 MB. SVG ve çalıştırılabilir dosyalar kabul edilmez.</p>
        <form action="/api/cms-media-upload" method="post" encType="multipart/form-data" className="content-form">
          <label><span>Dosya</span><input name="file" type="file" required accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/x-icon,image/vnd.microsoft.icon,application/pdf" /></label>
          <div className="content-grid"><label><span>Medya başlığı</span><input name="title" maxLength={180} placeholder="Boş bırakılırsa dosya adı kullanılır" /></label><label><span>Kullanım alanı</span><input name="usage" maxLength={180} placeholder="Örn. Ana Sayfa / Hero" /></label></div>
          <label><span>Alt metin</span><input name="altText" maxLength={300} placeholder="Görsel erişilebilirlik açıklaması" /></label><label><span>Not</span><textarea name="notes" maxLength={800} placeholder="Kaynak, lisans veya kullanım notu" /></label>
          <div className="content-form-actions"><button type="submit">Dosyayı Yükle</button></div>
        </form>
      </div>

      <details className="content-panel" style={{ marginTop: "1rem" }}><summary><strong>Mevcut public dosya yolunu kütüphaneye kaydet</strong></summary><form action={createMediaAssetAction} className="content-form" style={{ marginTop: "1rem" }}><div className="content-grid"><label><span>Medya başlığı</span><input name="title" required maxLength={180} placeholder="Örn. Ana sayfa hero görseli" /></label><label><span>Dosya yolu</span><input name="url" required maxLength={500} placeholder="/landing/ilkoku-hero.webp" /></label><label><span>Tür</span><select name="kind" defaultValue="image"><option value="image">Görsel</option><option value="document">Doküman</option><option value="icon">İkon</option><option value="other">Diğer</option></select></label><label><span>Kullanım alanı</span><input name="usage" maxLength={180} placeholder="Örn. Ana Sayfa / Hero" /></label></div><label><span>Alt metin</span><input name="altText" maxLength={300} /></label><label><span>Not</span><textarea name="notes" maxLength={800} /></label><div className="content-form-actions"><button type="submit">Dosya Yolunu Kaydet</button></div></form></details>

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <div className="content-page-heading" style={{ marginBottom: "1rem" }}><div><span>Kütüphane</span><h2>Aktif medya</h2></div></div>
        {assets.length === 0 && invalid.length === 0 ? <div className="content-empty"><strong>Medya kaydı henüz yok.</strong><p>İlk dosyayı yukarıdan yüklediğinizde burada önizlemesiyle birlikte görünecek.</p></div> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            {invalid.map(({ row }) => <article className="content-panel" key={`invalid-${row.contentKey}`} style={{ margin: 0 }}><strong>Bozuk medya metadata</strong><p><small>{row.contentKey}</small></p><p>Geçerli URL çıkarılamıyor. Ham kayıt korunuyor; arşivleme kilitli.</p><small>Güncelleme: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(row.updatedAt))}</small></article>)}
            {assets.map(({ contentKey, asset, updatedAt }) => { const isImage = asset.kind === "image" || asset.kind === "icon"; return <article className="content-panel" key={contentKey} style={{ margin: 0, display: "flex", flexDirection: "column", gap: ".8rem" }}><div style={{ minHeight: 150, display: "grid", placeItems: "center", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}>{isImage && asset.url ? <Image src={asset.url} alt={asset.altText || asset.title || "İlkOku medya"} width={640} height={360} unoptimized style={{ width: "100%", height: 150, objectFit: "contain" }} /> : <div style={{ textAlign: "center", padding: "2rem 1rem" }}><strong>{asset.kind === "document" ? "PDF / Doküman" : "Dosya"}</strong><br /><small>{asset.filename || asset.url || "—"}</small></div>}</div><div><strong>{asset.title || "İsimsiz medya"}</strong><p style={{ margin: ".35rem 0 0" }}><small>{asset.filename || asset.url}</small></p></div><div style={{ display: "grid", gap: ".3rem" }}><small>Tür: {asset.mimeType || asset.kind || "—"}</small><small>Boyut: {formatBytes(asset.sizeBytes)}</small><small>Kullanım: {asset.usage || "Belirtilmedi"}</small><small>Depolama: {asset.storage === "database" ? "Veritabanı" : "Public dosya yolu"}</small><small>Güncelleme: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(updatedAt))}</small>{asset.altText ? <small>Alt: {asset.altText}</small> : null}</div><div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}><CopyMediaUrlButton url={asset.url!} /><Link href={asset.url!} target="_blank">Dosyayı aç</Link></div>{access.canPublish ? <form action={archiveMediaAssetAction} style={{ marginTop: "auto" }}><input type="hidden" name="contentKey" value={contentKey} /><button type="submit">Arşivle</button></form> : <small style={{ marginTop: "auto" }}>Arşivleme için yayın yetkisi gerekir.</small>}</article>; })}
          </div>
        )}
      </div>
    </section>
  );
}
