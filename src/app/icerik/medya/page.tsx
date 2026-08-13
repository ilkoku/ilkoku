import { prisma } from "@/lib/prisma";
import { archiveMediaAssetAction, createMediaAssetAction } from "@/features/cms/media-actions";

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
  uploadedBy?: string;
};

export const dynamic = "force-dynamic";

export default async function MediaPage() {
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
          <p>Site içinde kullanılan görsel ve dosyaları tek kayıtta tutun; alt metin, kullanım alanı ve açıklamalarını yönetin.</p>
        </div>
      </div>

      <div className="content-panel">
        <form action={createMediaAssetAction} className="content-form">
          <div className="content-grid">
            <label><span>Medya başlığı</span><input name="title" required maxLength={180} placeholder="Örn. Ana sayfa hero görseli" /></label>
            <label><span>Dosya yolu</span><input name="url" required maxLength={500} placeholder="/landing/ilkoku-hero.webp" /></label>
            <label><span>Tür</span><select name="kind" defaultValue="image"><option value="image">Görsel</option><option value="document">Doküman</option><option value="icon">İkon</option><option value="other">Diğer</option></select></label>
            <label><span>Kullanım alanı</span><input name="usage" maxLength={180} placeholder="Örn. Ana Sayfa / Hero" /></label>
          </div>
          <label><span>Alt metin</span><input name="altText" maxLength={300} placeholder="Görsel erişilebilirlik açıklaması" /></label>
          <label><span>Not</span><textarea name="notes" maxLength={800} placeholder="Dosyanın amacı, kaynak veya kullanım notu" /></label>
          <div className="content-form-actions"><button type="submit">Kütüphaneye Ekle</button></div>
        </form>
      </div>

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        {assets.length === 0 ? (
          <div className="content-empty"><strong>Medya kaydı henüz yok.</strong><p>Mevcut public dosya yolunu yukarıdan kaydederek kütüphaneyi oluşturmaya başlayın.</p></div>
        ) : (
          <div className="content-list">
            <div className="content-list-row content-list-row--head"><span>Medya</span><span>Kullanım</span><span>Tür</span><span>İşlem</span></div>
            {assets.map(({ contentKey, asset, updatedAt }) => (
              <div className="content-list-row" key={contentKey}>
                <div><strong>{asset.title || "İsimsiz medya"}</strong><br /><small>{asset.url || "—"}</small>{asset.altText ? <><br /><small>Alt: {asset.altText}</small></> : null}</div>
                <span>{asset.usage || "Belirtilmedi"}</span>
                <span>{asset.kind === "image" ? "Görsel" : asset.kind === "document" ? "Doküman" : asset.kind === "icon" ? "İkon" : "Diğer"}<br /><small>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" }).format(new Date(updatedAt))}</small></span>
                <form action={archiveMediaAssetAction}><input type="hidden" name="contentKey" value={contentKey} /><button type="submit">Arşivle</button></form>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
