import { notFound } from "next/navigation";

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
import { GENRE_CATEGORIES, getGenresByCategory, type GenreCategory } from "@/lib/genres";

type PageProps = {
  params: Promise<{ category: string }>;
};

export const dynamic = "force-dynamic";

function categoryFromPath(path: string): GenreCategory | null {
  return GENRE_CATEGORIES.find((category) => educationCategoryPath(category) === path) ?? null;
}

export default async function EducationCategoryPage({ params }: PageProps) {
  const { category: categoryPath } = await params;
  const activeCategory = categoryFromPath(categoryPath);
  if (!activeCategory) notFound();

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

  const activeGenres = getGenresByCategory(activeCategory);

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>İçerik · Eğitim · Kategori</span>
          <h1>{activeCategory}</h1>
          <p>{activeGenres.length} tür bu kategori altında otomatik yönetilir. Tür kataloğuna aynı kategoriyle yeni kayıt eklendiğinde burada ayrıca işlem yapmadan görünür.</p>
        </div>
        <aside className="cms-editor-status-card" data-tone={dataError ? "danger" : "success"}>
          <span className="cms-editor-status-card__label">Kategori kapsamı</span>
          {dataError ? <strong>Veri okunamadı</strong> : <strong>{activeGenres.length} tür</strong>}
          <div className="cms-editor-status-card__meta">
            <span className="cms-editor-chip">Otomatik katalog</span>
            <span className="cms-editor-chip">7 görsel slotu / tür</span>
          </div>
        </aside>
      </div>

      {dataError ? (
        <div className="content-panel cms-editor-notice is-danger" role="alert">
          <strong>Eğitim kayıtları okunamadı.</strong>
          <p>Yanlış hazırlık durumu göstermemek için kategori çalışma masası güvenli biçimde durduruldu.</p>
        </div>
      ) : (
        <EducationWorkbench items={items} categories={categories} lockedCategory={activeCategory} />
      )}
    </section>
  );
}
