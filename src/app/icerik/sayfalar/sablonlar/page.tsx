import Link from "next/link";
import { CmsVisualPageBuilder, type CmsVisualBuilderMediaOption } from "@/components/content/CmsVisualPageBuilder";
import { requireCmsManager } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";
import { getPublicSiteIdentity } from "@/lib/site-identity";

type MediaRow = { valueJson: string };

export const dynamic = "force-dynamic";

function parseMedia(row: MediaRow): CmsVisualBuilderMediaOption | null {
  try {
    const value = JSON.parse(row.valueJson) as Record<string, unknown>;
    if (value.kind !== "image" || typeof value.url !== "string" || !value.url.startsWith("/api/media/")) return null;
    return {
      title: typeof value.title === "string" && value.title.trim() ? value.title.trim() : "CMS görseli",
      url: value.url,
      altText: typeof value.altText === "string" ? value.altText : "",
    };
  } catch {
    return null;
  }
}

export default async function CmsPageTemplatesPage() {
  const access = await requireCmsManager("/icerik/sayfalar/sablonlar");
  const [rows, identity] = await Promise.all([
    prisma.$queryRaw<MediaRow[]>`
      SELECT valueJson FROM SiteContent
      WHERE namespace = 'media' AND status = 'published'
      ORDER BY updatedAt DESC
      LIMIT 300
    `.catch(() => [] as MediaRow[]),
    getPublicSiteIdentity(),
  ]);
  const media = rows.map(parseMedia).filter((item): item is CmsVisualBuilderMediaOption => Boolean(item));

  return (
    <section className="content-editor-page" style={{ maxWidth: "none" }}>
      <div className="content-page-heading">
        <div>
          <span>Site · Görsel Sayfa Oluşturucu</span>
          <h1>İlkOku sayfasını görsel olarak oluştur</h1>
          <p>Hazır şablondan başlayın; Hero, metin, görsel, kart, CTA, adımlar, istatistik, SSS, galeri ve diğer İlkOku bloklarını ekleyip sıralayın.</p>
        </div>
        <aside className="cms-editor-status-card" data-tone="success" aria-label="Görsel oluşturucu durumu">
          <span className="cms-editor-status-card__label">Sayfa sistemi</span>
          <strong>Site kimliği ve responsive geometri kilitli</strong>
          <div className="cms-editor-status-card__meta"><span className="cms-editor-chip is-positive">Canlı önizleme</span><span className="cms-editor-chip is-positive">Drag / drop</span><span className="cms-editor-chip">13 blok</span></div>
        </aside>
      </div>

      <nav className="cms-editor-toolbar" aria-label="Görsel sayfa oluşturucu hızlı işlemleri">
        <div className="cms-editor-toolbar__cluster"><Link href="/icerik/sayfalar">← Kurumsal Sayfalar</Link><Link href="/icerik/sayfalar/yeni">Klasik metin sayfası</Link></div>
        <div className="cms-editor-toolbar__cluster"><Link href="/icerik/site-kimligi">Site Kimliği</Link><Link href="/icerik/medya">Medya</Link><Link href="/icerik/seo">SEO Merkezi</Link></div>
      </nav>

      <div className="content-panel cms-editor-notice is-info">
        <strong>Canva mantığı, İlkOku kuralları.</strong>
        <p>Sayfanın orta alanını bloklarla kurarsınız. Global header/footer, renk sistemi, tipografi, responsive davranış ve güvenli yayın zinciri ortak site sisteminden gelir; böylece yeni sayfa başka bir site gibi görünmez.</p>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <CmsVisualPageBuilder canPublish={access.canPublish} defaultEyebrow={identity.defaultEyebrow} media={media} />
      </div>
    </section>
  );
}
