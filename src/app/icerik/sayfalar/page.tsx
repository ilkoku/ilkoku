import Link from "next/link";
import { evaluateCmsPagePublishQuality } from "@/lib/cms-page-quality";
import { parseCmsPageBody } from "@/lib/cms-pages";
import { prisma } from "@/lib/prisma";
import { publicCmsPageCatalog } from "@/lib/public-cms-page-catalog";

type ContentPageRow = {
  id: string;
  contentKey: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  bodyJson: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  updatedAt: Date;
};

function hasCompleteSeo(page: ContentPageRow) {
  return Boolean(
    page.seoTitle?.trim()
      && page.seoDescription?.trim()
      && page.canonicalUrl?.trim()
      && !page.noIndex,
  );
}

function publicationQuality(page: ContentPageRow) {
  const content = parseCmsPageBody(page.bodyJson);
  const canonical = page.canonicalUrl?.trim() ?? "";
  const quality = evaluateCmsPagePublishQuality({
    slug: canonical,
    title: page.title,
    summary: content.summary,
    body: content.body,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    noIndex: page.noIndex,
  });
  const canonicalMatchesSlug = canonical === page.slug;
  const issues = quality.issues.map((item) => item.message);
  if (canonical && !canonicalMatchesSlug) {
    issues.push("Canonical adresi sayfanın gerçek public URL'siyle aynı olmalı.");
  }
  return {
    ok: quality.ok && canonicalMatchesSlug,
    issues,
    metrics: quality.metrics,
  };
}

export const dynamic = "force-dynamic";

export default async function Page() {
  let pages: ContentPageRow[] = [];
  let dataError = false;

  try {
    pages = await prisma.$queryRaw<ContentPageRow[]>`
      SELECT id, contentKey, slug, title, status, bodyJson, seoTitle, seoDescription,
             canonicalUrl, noIndex, updatedAt
      FROM ContentPage
      WHERE contentKey LIKE 'page:tr:%'
      ORDER BY updatedAt DESC
      LIMIT 250
    `;
  } catch {
    dataError = true;
  }

  const published = pages.filter((page) => page.status === "published").length;
  const drafts = pages.filter((page) => page.status === "draft").length;
  const archived = pages.filter((page) => page.status === "archived").length;
  const pageByContentKey = new Map(pages.map((page) => [page.contentKey, page]));
  const expectedCorePages = publicCmsPageCatalog.length;
  const publicCoverage = publicCmsPageCatalog.filter((item) => pageByContentKey.has(item.contentKey)).length;
  const publicPublished = publicCmsPageCatalog.filter((item) => pageByContentKey.get(item.contentKey)?.status === "published").length;
  const publicSeoReady = publicCmsPageCatalog.filter((item) => {
    const page = pageByContentKey.get(item.contentKey);
    return page?.status === "published" && hasCompleteSeo(page);
  }).length;
  const publicQualityReady = publicCmsPageCatalog.filter((item) => {
    const page = pageByContentKey.get(item.contentKey);
    return page?.status === "published" && publicationQuality(page).ok;
  }).length;
  const publicQualityDebt = Math.max(0, publicPublished - publicQualityReady);

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>İçerik · TR</span>
          <h1>Kurumsal Sayfalar</h1>
          <p>Hakkımızda ve public bilgilendirme sayfalarını taslak, önizleme, yayın, SEO, kalite ve sürüm geçmişiyle yönetin.</p>
        </div>
        <aside className="cms-editor-status-card" data-tone={dataError ? "danger" : publicQualityDebt > 0 ? "warning" : "success"} aria-label="Kurumsal sayfa özeti">
          <span className="cms-editor-status-card__label">İçerik özeti</span>
          {dataError ? (
            <><strong>Veri okunamadı</strong><div className="cms-editor-status-card__meta"><span className="cms-editor-chip is-danger">Sayaçlar durduruldu</span></div></>
          ) : (
            <><strong>{published} sayfa yayında</strong><div className="cms-editor-status-card__meta"><span className="cms-editor-chip is-warning">{drafts} taslak</span><span className="cms-editor-chip">{archived} arşiv</span>{publicQualityDebt > 0 ? <span className="cms-editor-chip is-warning">{publicQualityDebt} çekirdek kalite borcu</span> : null}</div></>
          )}
        </aside>
      </div>

      {dataError ? (
        <div className="content-panel cms-editor-notice is-danger" role="alert">
          <strong>Kurumsal sayfa kayıtları okunamadı.</strong>
          <p>Gerçek kayıtları “0 sayfa” kabul edip yeni içerik veya yanlış aksiyon önermemek için liste ve oluşturma işlemleri güvenli biçimde durduruldu. Veritabanı durumunu kontrol ettikten sonra bu ekranı yeniden açın.</p>
          <div className="content-form-actions" style={{ flexWrap: "wrap" }}>
            <Link href="/icerik/saglik">Sistem Sağlığı →</Link>
            <Link href="/icerik/hazirlik">Yayın Hazırlığı →</Link>
            <Link href="/icerik/sayfalar">Tekrar dene ↻</Link>
          </div>
        </div>
      ) : (
        <>
          <nav className="cms-editor-toolbar" aria-label="Kurumsal sayfa hızlı işlemleri">
            <div className="cms-editor-toolbar__cluster">
              <Link href="/icerik/sayfalar/yeni">+ Yeni kurumsal sayfa</Link>
            </div>
            <div className="cms-editor-toolbar__cluster">
              <Link href="/icerik/seo">SEO Merkezi</Link>
              <Link href="/sitemap.xml" target="_blank">Sitemap ↗</Link>
              <Link href="/icerik/yayin-kuyrugu">Yayın Kuyruğu</Link>
              <Link href="/icerik/gecmis">Sürüm Geçmişi</Link>
            </div>
          </nav>

          <div className="content-panel cms-editor-notice is-info">
            <strong>CMS kayıt kalitesi denetimi</strong>
            <p>Bu tarama mevcut canlı sayfaları otomatik olarak yayından kaldırmaz. Bir sonraki CMS yayını aynı kalite kapısından geçer; bu ekran ise bugün veritabanında duran kalıcı kaydın hangi maddelerde iyileştirilmesi gerektiğini gösterir.</p>
            <p>Sekiz güven/rol sayfasında eski CMS metnini geçici bundled köprü örtebilir. Bu nedenle buradaki “kalite borcu” ifadesi doğrudan canlı ziyaretçi çıktısının bozuk olduğu anlamına gelmez; köprünün ileride güvenle kaldırılabilmesi için kalıcı CMS kaydındaki borcu görünür kılar.</p>
          </div>

          <div className="content-panel">
            <div className="content-section-heading">
              <div><span>Public sayfa envanteri</span><h2>Çekirdek public sayfaların CMS, SEO ve yayın kalitesi</h2></div>
              <p>Hakkımızda dahil dokuz çekirdek public CMS sayfası tek tek izlenir. SEO görünürlüğü ile metin/yayın kalitesi ayrı değerlendirilir; canonical adresin gerçek public URL ile eşleşmesi de kayıt kalitesinin parçasıdır.</p>
            </div>
            <div className="content-metric-grid">
              <article className="content-metric-card"><span>CMS kaydı</span><strong>{publicCoverage}/{expectedCorePages}</strong><small>beklenen public sayfa</small></article>
              <article className="content-metric-card"><span>Yayında</span><strong>{publicPublished}/{expectedCorePages}</strong><small>public CMS kaydı</small></article>
              <article className="content-metric-card"><span>SEO hazır</span><strong>{publicSeoReady}/{expectedCorePages}</strong><small>title · description · canonical · index</small></article>
              <article className="content-metric-card"><span>Kalite hazır</span><strong>{publicQualityReady}/{expectedCorePages}</strong><small>CMS kayıt kalitesi</small></article>
            </div>
            <div className="content-list" style={{ marginTop: "1rem" }}>
              {publicCmsPageCatalog.map((item) => {
                const page = pageByContentKey.get(item.contentKey);
                const seoReady = page ? hasCompleteSeo(page) : false;
                const quality = page ? publicationQuality(page) : null;
                return (
                  <div className="content-list-row" key={item.contentKey} style={{ alignItems: "flex-start", gap: "1rem" }}>
                    <div style={{ minWidth: 150 }}>
                      <strong>{page ? (page.status === "published" ? "YAYINDA" : page.status === "archived" ? "ARŞİV" : "TASLAK") : "EKSİK"}</strong>
                      <br />
                      <small>{page?.status === "published" ? (seoReady ? "SEO HAZIR" : "SEO KONTROL") : "CMS KAYDI"}</small>
                      {quality ? <><br /><small>{quality.ok ? "KALİTE HAZIR" : `${quality.issues.length} KALİTE EKSİĞİ`}</small></> : null}
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong>{item.label}</strong>
                      <p style={{ margin: ".35rem 0 0" }}>{item.slug}</p>
                      {quality && !quality.ok ? (
                        <ul style={{ margin: ".55rem 0 0", paddingLeft: "1.15rem" }}>
                          {quality.issues.map((message, index) => <li key={`${item.contentKey}-${index}`}>{message}</li>)}
                        </ul>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", gap: ".55rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {page ? <Link href={`/icerik/sayfalar/${page.id}`}>Düzenle →</Link> : <Link href="/icerik/hazirlik">Eksik kaydı tamamla →</Link>}
                      {page ? <Link href={`/icerik/onizleme/sayfa/${page.id}`}>Önizle ↗</Link> : null}
                      {page?.status === "published" ? <Link href={item.slug} target="_blank">Canlı ↗</Link> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="content-panel" style={{ marginTop: "1rem" }}>
            {pages.length === 0 ? (
              <div className="content-empty-state">
                <strong>Henüz kurumsal CMS sayfası yok.</strong>
                <p>Bu boş durum yalnız veritabanı başarıyla okunduğunda gösterilir. İlk sayfayı oluşturduğunuzda burada görünecek.</p>
                <Link href="/icerik/sayfalar/yeni">İlk sayfayı oluştur →</Link>
              </div>
            ) : (
              <div className="content-table-wrap">
                <table className="content-table">
                  <thead>
                    <tr>
                      <th>Başlık</th>
                      <th>URL</th>
                      <th>Durum</th>
                      <th>SEO</th>
                      <th>Kalite</th>
                      <th>Son güncelleme</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map((page) => {
                      const quality = publicationQuality(page);
                      return (
                        <tr key={page.id}>
                          <td><strong>{page.title}</strong></td>
                          <td>{page.slug}</td>
                          <td><span className={`cms-status-pill is-${page.status}`}>{page.status === "published" ? "Yayında" : page.status === "archived" ? "Arşiv" : "Taslak"}</span></td>
                          <td><span className={`cms-status-pill ${page.noIndex ? "is-noindex" : "is-index"}`}>{page.noIndex ? "Noindex" : hasCompleteSeo(page) ? "SEO hazır" : "SEO kontrol"}</span></td>
                          <td><span className={`cms-status-pill ${quality.ok ? "is-index" : "is-noindex"}`}>{quality.ok ? "Hazır" : `${quality.issues.length} eksik`}</span></td>
                          <td>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(page.updatedAt))}</td>
                          <td>
                            <div className="cms-editor-toolbar__cluster">
                              <Link href={`/icerik/sayfalar/${page.id}`}>Düzenle →</Link>
                              <Link href={`/icerik/onizleme/sayfa/${page.id}`}>Önizle ↗</Link>
                              {page.status === "published" ? <Link href={page.slug} target="_blank">Canlı ↗</Link> : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
