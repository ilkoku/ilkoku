import Link from "next/link";

import {
  EducationWorkbench,
  type EducationWorkbenchCategory,
  type EducationWorkbenchItem,
} from "@/components/content/EducationWorkbench";
import {
  educationCategoryPath,
  educationPublicPath,
  listEducationGuideRecords,
} from "@/lib/cms-education";
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

  const items: EducationWorkbenchItem[] = records.map(({ genre, guide, updatedAt }) => ({
    slug: genre.slug,
    label: genre.label,
    category: genre.category,
    categoryPath: educationCategoryPath(genre.category),
    visualCount: Object.keys(guide.visuals).length,
    updatedAt: updatedAt?.toISOString() ?? null,
    editHref: `/icerik/egitim/${genre.slug}`,
    publicHref: educationPublicPath(genre),
  }));

  const bySlug = new Map(items.map((item) => [item.slug, item]));
  const categories: EducationWorkbenchCategory[] = GENRE_CATEGORIES.map((category) => {
    const genres = getGenresByCategory(category);
    const counts = genres.map((genre) => bySlug.get(genre.slug)?.visualCount ?? 0);
    const complete = counts.filter((count) => count >= 7).length;
    const inProgress = counts.filter((count) => count > 0 && count < 7).length;
    return {
      label: category,
      path: educationCategoryPath(category),
      total: genres.length,
      complete,
      inProgress,
      notStarted: Math.max(0, genres.length - complete - inProgress),
    };
  });

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>İçerik · Eğitim</span>
          <h1>Eğitim Çalışma Masası</h1>
          <p>Kategori, tür ve görsel hazırlık durumunu tek ekrandan filtrele. Kategori sayfalarına gir, ilgili türleri yönet ve 7 ana görseli bilgisayarından manuel yükle.</p>
        </div>
        <aside className="cms-editor-status-card" data-tone={dataError ? "danger" : "success"}>
          <span className="cms-editor-status-card__label">Canlı katalog</span>
          {dataError ? <strong>Veri okunamadı</strong> : <strong>{GENRES.length} tür</strong>}
          <div className="cms-editor-status-card__meta">
            <span className="cms-editor-chip">{GENRE_CATEGORIES.length} kategori</span>
            <span className="cms-editor-chip">Tür kataloğuna bağlı</span>
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
          <p>Yanlış hazırlık durumu göstermemek için çalışma masası güvenli biçimde durduruldu. Veritabanı bağlantısını kontrol edip tekrar deneyin.</p>
          <div className="content-form-actions">
            <Link href="/icerik/saglik">Sistem Sağlığı →</Link>
            <Link href="/icerik/egitim">Tekrar dene ↻</Link>
          </div>
        </div>
      ) : (
        <EducationWorkbench items={items} categories={categories} />
      )}
    </section>
  );
}
