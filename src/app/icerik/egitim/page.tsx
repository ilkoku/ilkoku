import Link from "next/link";

import {
  EducationWorkbench,
  type EducationWorkbenchCategory,
  type EducationWorkbenchItem,
} from "@/components/content/EducationWorkbench";
import styles from "@/components/content/EducationWorkbench.module.css";
import {
  educationCategoryPath,
  educationPublicPath,
  listEducationGuideRecords,
} from "@/lib/cms-education";
import { GENRE_CATEGORIES, GENRES, getGenresByCategory } from "@/lib/genres";

export const dynamic = "force-dynamic";

export default async function EducationDashboardPage() {
  const result = await Promise.allSettled([listEducationGuideRecords()]);
  const records = result[0].status === "fulfilled" ? result[0].value : [];
  const dataError = result[0].status === "rejected";

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
    <section className={`content-editor-page ${styles.pageShell}`}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderCopy}>
          <span className={styles.eyebrow}>İçerik · Eğitim</span>
          <h1>Eğitim Çalışma Masası</h1>
          <p>Yazar tür eğitimlerini tek çalışma masasından yönet.</p>
        </div>
        <div className={styles.headerMeta}>
          <strong>{dataError ? "—" : GENRES.length}</strong>
          <span>yazar türü · {GENRE_CATEGORIES.length} kategori</span>
          <span>her türde 7 görsel slotu</span>
        </div>
      </header>

      <nav className={styles.quickNav} aria-label="Eğitim hızlı işlemleri">
        <Link href="/icerik/okur-egitim">Okur Eğitim Merkezi</Link>
        <Link href="/icerik/medya">Medya</Link>
        <Link href="/icerik/sayfalar/sablonlar">Şablonlar</Link>
      </nav>

      {dataError ? (
        <div className="content-panel cms-editor-notice is-danger" role="alert">
          <strong>Yazar eğitim kayıtları okunamadı.</strong>
          <p>Yanlış hazırlık durumu göstermemek için yazar eğitim çalışma masası güvenli biçimde durduruldu.</p>
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
