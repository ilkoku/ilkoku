import Link from "next/link";
import { CmsPageTemplateBuilder } from "@/components/content/CmsPageTemplateBuilder";
import { requireCmsManager } from "@/lib/cms-access";

export const dynamic = "force-dynamic";

export default async function CmsPageTemplatesPage() {
  await requireCmsManager("/icerik/sayfalar/sablonlar");

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Site · Sayfa Şablonları</span>
          <h1>Şablondan yeni sayfa oluştur</h1>
          <p>İlkOku'nun ortak public kimliğini bozmadan hazır içerik iskeletlerinden yeni kurumsal sayfa başlatın. Kod değişikliği gerekmez.</p>
        </div>
        <aside className="cms-editor-status-card" data-tone="success" aria-label="Şablon sistemi durumu">
          <span className="cms-editor-status-card__label">Şablon sistemi</span>
          <strong>Standart public kimlik kilitli</strong>
          <div className="cms-editor-status-card__meta">
            <span className="cms-editor-chip is-positive">Header / footer otomatik</span>
            <span className="cms-editor-chip">Taslak odaklı</span>
          </div>
        </aside>
      </div>

      <nav className="cms-editor-toolbar" aria-label="Sayfa şablonları hızlı işlemleri">
        <div className="cms-editor-toolbar__cluster">
          <Link href="/icerik/sayfalar">← Kurumsal Sayfalar</Link>
          <Link href="/icerik/sayfalar/yeni">Boş sayfa editörü</Link>
        </div>
        <div className="cms-editor-toolbar__cluster">
          <Link href="/icerik/site-kimligi">Site Kimliği</Link>
          <Link href="/icerik/medya">Medya</Link>
          <Link href="/icerik/seo">SEO Merkezi</Link>
        </div>
      </nav>

      <div className="content-panel cms-editor-notice is-info">
        <strong>Bu bir serbest tasarım aracı değildir.</strong>
        <p>Renk, font, header ve footer geometrisi şablon tarafından korunur. Siz sayfanın türünü, URL'sini, başlığını ve içeriğini seçersiniz. Böylece yeni sayfalar mevcut İlkOku sitesinin parçası gibi görünmeye devam eder.</p>
      </div>

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <CmsPageTemplateBuilder />
      </div>
    </section>
  );
}
