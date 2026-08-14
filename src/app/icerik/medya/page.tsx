import Image from "next/image";
import Link from "next/link";
import { CopyMediaUrlButton } from "@/components/content/CopyMediaUrlButton";
import { archiveMediaAssetAction, createMediaAssetAction } from "@/features/cms/media-actions";
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

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

function formatBytes(input?: number) {
  const bytes = Number(input ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const uploadErrors: Record<string, string> = {
  form: "Yükleme formu okunamadı.",
  dosya: "Lütfen bir dosya seçin.",
  boyut: "Dosya 3 MB sınırını aşıyor.",
  tip: "Bu dosya türü desteklenmiyor veya dosya imzası geçersiz.",
  okuma: "Dosya okunamadı.",
  kayit: "Dosya kaydedilemedi. Lütfen tekrar deneyin.",
};

export default async function MediaPage({ searchParams }: PageProps) {
  const query = (await searchParams) ?? {};
  const errorKey = typeof query.hata === "string" ? query.hata : "";
  const uploaded = query.yuklendi === "1";

  let rows: MediaRow[] = [];
  try {
    rows = await prisma.$queryRaw<MediaRow[]>`
      SELECT contentKey, valueJson, status, updatedAt
      FROM SiteContent
      WHERE namespace = 'media' AND status <> 'archived'
      ORDER BY updatedAt DESC
      LIMIT 200
    `;
  } catch {
    rows = [];
  }

  const assets = rows.map((row) => {
    let asset: MediaAsset = {};
    try { asset = JSON.parse(row.valueJson) as MediaAsset; } catch { asset = {}; }
    return { ...row, asset };
  });

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>İçerik</span>
          <h1>Medya Kütüphanesi</h1>
          <p>Görsel ve dokümanları gerçekten yükleyin; önizleme, alt metin, kullanım alanı ve kalıcı URL bilgisini tek merkezden yönetin.</p>
        </div>
        <div className="content-profile">
          <strong>{assets.length} aktif medya</strong>
          <small>DB-backed kalıcı depolama</small>
        </div>
      </div>

      {uploaded ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>Dosya yüklendi.</strong> Kalıcı medya URL&apos;si aşağıdaki kütüphaneye eklendi.
        </div>
      ) : null}

      {errorKey && uploadErrors[errorKey] ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>Yükleme tamamlanamadı:</strong> {uploadErrors[errorKey]}
        </div>
      ) : null}

      <div className="content-panel">
        <h2>Yeni dosya yükle</h2>
        <p className="content-form-help">JPEG, PNG, WebP, GIF, AVIF, ICO veya PDF · en fazla 3 MB. SVG ve çalıştırılabilir dosyalar kabul edilmez.</p>
        <form action="/api/cms-media-upload" method="post" encType="multipart/form-data" className="content-form">
          <label>
            <span>Dosya</span>
            <input
              name="file"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/x-icon,image/vnd.microsoft.icon,application/pdf"
            />
          </label>
          <div className="content-grid">
            <label><span>Medya başlığı</span><input name="title" maxLength={180} placeholder="Boş bırakılırsa dosya adı kullanılır" /></label>
            <label><span>Kullanım alanı</span><input name="usage" maxLength={180} placeholder="Örn. Ana Sayfa / Hero" /></label>
          </div>
          <label><span>Alt metin</span><input name="altText" maxLength={300} placeholder="Görsel erişilebilirlik açıklaması" /></label>
          <label><span>Not</span><textarea name="notes" maxLength={800} placeholder="Kaynak, lisans veya kullanım notu" /></label>
          <div className="content-form-actions"><button type="submit">Dosyayı Yükle</button></div>
        </form>
      </div>

      <details className="content-panel" style={{ marginTop: "1rem" }}>
        <summary><strong>Mevcut public dosya yolunu kütüphaneye kaydet</strong></summary>
        <form action={createMediaAssetAction} className="content-form" style={{ marginTop: "1rem" }}>
          <div className="content-grid">
            <label><span>Medya başlığı</span><input name="title" required maxLength={180} placeholder="Örn. Ana sayfa hero görseli" /></label>
            <label><span>Dosya yolu</span><input name="url" required maxLength={500} placeholder="/landing/ilkoku-hero.webp" /></label>
            <label><span>Tür</span><select name="kind" defaultValue="image"><option value="image">Görsel</option><option value="document">Doküman</option><option value="icon">İkon</option><option value="other">Diğer</option></select></label>
            <label><span>Kullanım alanı</span><input name="usage" maxLength={180} placeholder="Örn. Ana Sayfa / Hero" /></label>
          </div>
          <label><span>Alt metin</span><input name="altText" maxLength={300} /></label>
          <label><span>Not</span><textarea name="notes" maxLength={800} /></label>
          <div className="content-form-actions"><button type="submit">Dosya Yolunu Kaydet</button></div>
        </form>
      </details>

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <div className="content-page-heading" style={{ marginBottom: "1rem" }}>
          <div><span>Kütüphane</span><h2>Aktif medya</h2></div>
        </div>

        {assets.length === 0 ? (
          <div className="content-empty"><strong>Medya kaydı henüz yok.</strong><p>İlk dosyayı yukarıdan yüklediğinizde burada önizlemesiyle birlikte görünecek.</p></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            {assets.map(({ contentKey, asset, updatedAt }) => {
              const isImage = asset.kind === "image" || asset.kind === "icon";
              return (
                <article className="content-panel" key={contentKey} style={{ margin: 0, display: "flex", flexDirection: "column", gap: ".8rem" }}>
                  <div style={{ minHeight: 150, display: "grid", placeItems: "center", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}>
                    {isImage && asset.url ? (
                      <Image
                        src={asset.url}
                        alt={asset.altText || asset.title || "İlkOku medya"}
                        width={640}
                        height={360}
                        unoptimized
                        style={{ width: "100%", height: 150, objectFit: "contain" }}
                      />
                    ) : (
                      <div style={{ textAlign: "center", padding: "2rem 1rem" }}><strong>{asset.kind === "document" ? "PDF / Doküman" : "Dosya"}</strong><br /><small>{asset.filename || asset.url || "—"}</small></div>
                    )}
                  </div>

                  <div>
                    <strong>{asset.title || "İsimsiz medya"}</strong>
                    <p style={{ margin: ".35rem 0 0" }}><small>{asset.filename || asset.url || "—"}</small></p>
                  </div>

                  <div style={{ display: "grid", gap: ".3rem" }}>
                    <small>Tür: {asset.mimeType || asset.kind || "—"}</small>
                    <small>Boyut: {formatBytes(asset.sizeBytes)}</small>
                    <small>Kullanım: {asset.usage || "Belirtilmedi"}</small>
                    <small>Depolama: {asset.storage === "database" ? "Veritabanı" : "Public dosya yolu"}</small>
                    <small>Güncelleme: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(updatedAt))}</small>
                    {asset.altText ? <small>Alt: {asset.altText}</small> : null}
                  </div>

                  {asset.url ? (
                    <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                      <CopyMediaUrlButton url={asset.url} />
                      <Link href={asset.url} target="_blank">Dosyayı aç</Link>
                    </div>
                  ) : null}

                  <form action={archiveMediaAssetAction} style={{ marginTop: "auto" }}>
                    <input type="hidden" name="contentKey" value={contentKey} />
                    <button type="submit">Arşivle</button>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
