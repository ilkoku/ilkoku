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
import { listReaderEducationGuideRecords } from "@/lib/cms-reader-education";
import { GENRE_CATEGORIES, GENRES, getGenresByCategory } from "@/lib/genres";
import { READER_EDUCATION_CATEGORIES, readerEducationPublicPath } from "@/lib/reader-education";

export const dynamic = "force-dynamic";

export default async function EducationDashboardPage() {
  const [writerResult, readerResult] = await Promise.allSettled([
    listEducationGuideRecords(),
    listReaderEducationGuideRecords(),
  ]);
  const records = writerResult.status === "fulfilled" ? writerResult.value : [];
  const readerRecords = readerResult.status === "fulfilled" ? readerResult.value : [];
  const dataError = writerResult.status === "rejected";
  const readerDataError = readerResult.status === "rejected";

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
  const readerBySlug = new Map(readerRecords.map((record) => [record.category.slug, record]));

  return (
    <section className={`content-editor-page ${styles.pageShell}`}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderCopy}>
          <span className={styles.eyebrow}>İçerik · Eğitim</span>
          <h1>Eğitim Çalışma Masası</h1>
          <p>Yazar tür eğitimlerini ve okur eğitim alanlarını aynı çalışma masasından yönet.</p>
        </div>
        <div className={styles.headerMeta}>
          <strong>{dataError ? "—" : GENRES.length}</strong>
          <span>yazar türü · {GENRE_CATEGORIES.length} kategori</span>
          <span>{READER_EDUCATION_CATEGORIES.length} okur eğitimi</span>
        </div>
      </header>

      <nav className={styles.quickNav} aria-label="Eğitim hızlı işlemleri">
        <Link href="/icerik/medya">Medya</Link>
        <Link href="/icerik/sayfalar/sablonlar">Şablonlar</Link>
        <a href="#okur-egitimleri">Okur Eğitimleri</a>
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

      <section id="okur-egitimleri" className="mt-8 rounded-[1.4rem] border border-black/10 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-5">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Okurluk Okulu</span>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#211746]">8 ana okur eğitimi</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6a6472]">Her sayfa 6 gelecekteki görsel slotuna sahiptir. Görsel yüklenene kadar canlı sayfada boş alan oluşmaz.</p>
          </div>
          <strong className="rounded-full bg-[#17122f] px-4 py-2 text-sm text-white">48 slot · şu an görselsiz başlayabilir</strong>
        </div>

        {readerDataError ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Okur eğitim kayıtları okunamadı. Yazar eğitimleri etkilenmeden çalışmaya devam eder.
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {READER_EDUCATION_CATEGORIES.map((category) => {
              const record = readerBySlug.get(category.slug);
              const visualCount = record ? Object.keys(record.guide.visuals).length : 0;
              return (
                <article className="rounded-[1.2rem] border border-black/[0.07] bg-[#faf8ff] p-4" key={category.slug}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-[#8a78c8]">{category.number}</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-[#5b35dd] shadow-sm">{visualCount}/6 görsel</span>
                  </div>
                  <h3 className="mt-3 text-base font-extrabold leading-6 text-[#211746]">{category.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-[#6a6472]">{category.shortDescription}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                    <Link className="rounded-full bg-[#211746] px-3 py-2 text-white" href={`/icerik/egitim/okur/${category.slug}`}>Yönet</Link>
                    <Link className="rounded-full border border-black/10 bg-white px-3 py-2 text-[#5b35dd]" href={readerEducationPublicPath(category)} target="_blank">Canlı sayfa ↗</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
