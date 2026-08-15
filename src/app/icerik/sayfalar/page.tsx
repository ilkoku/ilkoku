import Link from "next/link";
import { prisma } from "@/lib/prisma";

type ContentPageRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  noIndex: boolean;
  updatedAt: Date;
};

export const dynamic = "force-dynamic";

export default async function Page() {
  let pages: ContentPageRow[] = [];
  let dataError = false;

  try {
    pages = await prisma.$queryRaw<ContentPageRow[]>`
      SELECT id, slug, title, status, noIndex, updatedAt
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

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>İçerik · TR</span>
          <h1>Kurumsal Sayfalar</h1>
          <p>Hakkımızda ve benzeri bilgilendirme sayfalarını taslak, önizleme, yayın, SEO ve sürüm geçmişiyle yönetin.</p>
        </div>
        <div className="content-profile">
          {dataError ? (
            <><strong>VERİ OKUNAMADI</strong><small>Sayaçlar güvenli biçimde durduruldu</small></>
          ) : (
            <><strong>{published} yayında</strong><small>{drafts} taslak · {archived} arşiv</small></>
          )}
        </div>
      </div>

      {dataError ? (
        <div className="content-panel" role="alert">
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
          <div className="content-form-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
            <Link href="/icerik/sayfalar/yeni">+ Yeni kurumsal sayfa</Link>
            <Link href="/icerik/yayin-kuyrugu">Yayın Kuyruğu</Link>
            <Link href="/icerik/gecmis">Sürüm Geçmişi</Link>
          </div>

          <div className="content-panel">
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
                      <th>Son güncelleme</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map((page) => (
                      <tr key={page.id}>
                        <td><strong>{page.title}</strong></td>
                        <td>{page.slug}</td>
                        <td>{page.status === "published" ? "Yayında" : page.status === "archived" ? "Arşiv" : "Taslak"}</td>
                        <td>{page.noIndex ? "Noindex" : "Index"}</td>
                        <td>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(page.updatedAt))}</td>
                        <td>
                          <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
                            <Link href={`/icerik/sayfalar/${page.id}`}>Düzenle →</Link>
                            <Link href={`/icerik/onizleme/sayfa/${page.id}`}>Önizle ↗</Link>
                            {page.status === "published" ? <Link href={page.slug} target="_blank">Canlı ↗</Link> : null}
                          </div>
                        </td>
                      </tr>
                    ))}
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
