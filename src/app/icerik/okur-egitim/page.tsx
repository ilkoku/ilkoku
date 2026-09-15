import Link from "next/link";

import {
  EducationWorkbench,
  type EducationWorkbenchCategory,
  type EducationWorkbenchItem,
} from "@/components/content/EducationWorkbench";
import styles from "@/components/content/EducationWorkbench.module.css";
import { listReaderEducationGuideRecords } from "@/lib/cms-reader-education";
import { READER_EDUCATION_CATEGORIES, readerEducationPublicPath } from "@/lib/reader-education";

export const dynamic = "force-dynamic";

export default async function ReaderEducationDashboardPage() {
  const result = await Promise.allSettled([listReaderEducationGuideRecords()]);
  const records = result[0].status === "fulfilled" ? result[0].value : [];
  const dataError = result[0].status === "rejected";

  const items: EducationWorkbenchItem[] = records.map(({ category, guide, updatedAt }) => ({
    slug: category.slug,
    label: category.title,
    category: "Okurluk Okulu",
    categoryPath: "okurluk-okulu",
    visualCount: Object.keys(guide.visuals).length,
    updatedAt: updatedAt?.toISOString() ?? null,
    editHref: `/icerik/okur-egitim/${category.slug}`,
    publicHref: readerEducationPublicPath(category),
  }));

  const counts = items.map((item) => item.visualCount);
  const complete = counts.filter((count) => count >= 6).length;
  const inProgress = counts.filter((count) => count > 0 && count < 6).length;
  const categories: EducationWorkbenchCategory[] = [{
    label: "Okurluk Okulu",
    path: "okurluk-okulu",
    total: READER_EDUCATION_CATEGORIES.length,
    complete,
    inProgress,
    notStarted: Math.max(0, READER_EDUCATION_CATEGORIES.length - complete - inProgress),
  }];

  return (
    <section className={`content-editor-page ${styles.pageShell}`}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderCopy}>
          <span className={styles.eyebrow}>İçerik · Eğitim</span>
          <h1>Okur Eğitim Merkezi</h1>
          <p>Okurluk Okulu’nun 8 ana eğitim sayfasını, yazar Eğitim Merkezi ile aynı çalışma masası üzerinden yönet.</p>
        </div>
        <div className={styles.headerMeta}>
          <strong>{dataError ? "—" : READER_EDUCATION_CATEGORIES.length}</strong>
          <span>okur eğitimi</span>
          <span>her eğitimde 6 görsel slotu</span>
        </div>
      </header>

      <nav className={styles.quickNav} aria-label="Okur eğitimi hızlı işlemleri">
        <Link href="/icerik/egitim">Eğitim Merkezi</Link>
        <Link href="/icerik/editor-egitim">Editör Eğitim Merkezi</Link>
        <Link href="/icerik/medya">Medya</Link>
        <Link href="/nasil-calisir" target="_blank">Nasıl Çalışır ↗</Link>
      </nav>

      {dataError ? (
        <div className="content-panel cms-editor-notice is-danger" role="alert">
          <strong>Okur eğitim kayıtları okunamadı.</strong>
          <p>Yanlış hazırlık durumu göstermemek için Okur Eğitim Merkezi güvenli biçimde durduruldu.</p>
          <div className="content-form-actions">
            <Link href="/icerik/saglik">Sistem Sağlığı →</Link>
            <Link href="/icerik/okur-egitim">Tekrar dene ↻</Link>
          </div>
        </div>
      ) : (
        <EducationWorkbench
          items={items}
          categories={categories}
          lockedCategory="Okurluk Okulu"
          visualTarget={6}
          entityLabel="eğitim"
          itemColumnLabel="Eğitim"
          searchPlaceholder="Aktif okuma, edebi okuma, okuma kültürü…"
          inventoryLabel="Okur eğitim envanteri"
          showLockedCategoryBar={false}
        />
      )}
    </section>
  );
}
