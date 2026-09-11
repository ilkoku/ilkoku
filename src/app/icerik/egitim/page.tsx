import Link from "next/link";
import { EDUCATION_VISUAL_SLOTS, listEducationGuideRecords } from "@/lib/cms-education";
import { GENRE_CATEGORIES, GENRES, getGenresByCategory } from "@/lib/genres";

export const dynamic = "force-dynamic";

export default async function EducationDashboardPage() {
  let records: Awaited<ReturnType<typeof listEducationGuideRecords>> = [];
  let dataError = false;
  try {
    records = await listEducationGuideRecords();
  } catch {
    dataError = true;
  }

  const bySlug = new Map(records.map((item) => [item.genre.slug, item]));
  const configured = records.filter((item) => Object.keys(item.guide.visuals).length > 0).length;
  const complete = records.filter((item) => Object.keys(item.guide.visuals).length === EDUCATION_VISUAL_SLOTS.length).length;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>İçerik · Eğitim</span>
          <h1>Eğitim Sayfaları</h1>
          <p>7 ana kategori ve eser türlerinin yazarlık eğitim sayfalarını tek yerden yönet. Metinleri düzenle, 7 ana görseli bilgisayarından manuel yükle ve her türün hazırlık durumunu izle.</p>
        </div>
        <aside className="cms-editor-status-card" data-tone={dataError ? "danger" : complete > 0 ? "success" : "warning"}>
          <span className="cms-editor-status-card__label">Eğitim envanteri</span>
          {dataError ? <strong>Veri okunamadı</strong> : <strong>{GENRES.length} tür</strong>}
          <div className="cms-editor-status-card__meta">
            <span className="cms-editor-chip">{GENRE_CATEGORIES.length} kategori</span>
            <span className="cms-editor-chip is-warning">{configured} görsel başlanmış</span>
            <span className="cms-editor-chip">{complete} görsel seti tam</span>
          </div>
        </aside>
      </div>

      <nav className="cms-editor-toolbar" aria-label="Eğitim hızlı işlemleri">
        <div className="cms-editor-toolbar__cluster">
          <Link href="/icerik/medya">Medya Kütüphanesi</Link>
          <Link href="/icerik/sayfalar/sablonlar">Sayfa Şablonları</Link>
        </div>
      </nav>

      {dataError ? (
        <div className="content-panel cms-editor-notice is-danger" role="alert">
          <strong>Eğitim kayıtları okunamadı.</strong>
          <p>Yanlış “0 kayıt” göstermemek için liste güvenli biçimde durduruldu. Veritabanı bağlantısını kontrol edip tekrar deneyin.</p>
          <Link href="/icerik/saglik">Sistem Sağlığı →</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {GENRE_CATEGORIES.map((category) => {
            const genres = getGenresByCategory(category);
            const categoryComplete = genres.filter((genre) => Object.keys(bySlug.get(genre.slug)?.guide.visuals ?? {}).length === EDUCATION_VISUAL_SLOTS.length).length;
            return (
              <section className="content-panel" key={category}>
                <div className="content-section-heading">
                  <div><span>Ana kategori</span><h2>{category}</h2></div>
                  <p>{genres.length} tür · {categoryComplete}/{genres.length} görsel seti tamam</p>
                </div>
                <div className="content-list">
                  {genres.map((genre) => {
                    const entry = bySlug.get(genre.slug);
                    const visualCount = Object.keys(entry?.guide.visuals ?? {}).length;
                    return (
                      <div className="content-list-row" key={genre.slug} style={{ gap: "1rem", alignItems: "center" }}>
                        <div style={{ minWidth: 90 }}>
                          <strong>{visualCount}/7</strong><br />
                          <small>{visualCount === 7 ? "GÖRSEL TAM" : visualCount > 0 ? "DEVAM EDİYOR" : "HAZIRLANACAK"}</small>
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong>{genre.label}</strong>
                          <p style={{ margin: ".25rem 0 0" }}>/yazarlar-icin/…/{genre.slug}</p>
                        </div>
                        <Link href={`/icerik/egitim/${genre.slug}`}>Yönet →</Link>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
