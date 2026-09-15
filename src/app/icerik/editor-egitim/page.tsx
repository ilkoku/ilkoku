import Link from "next/link";

import {
  EducationWorkbench,
  type EducationWorkbenchCategory,
  type EducationWorkbenchItem,
} from "@/components/content/EducationWorkbench";
import styles from "@/components/content/EducationWorkbench.module.css";
import { listEditorEducationGuideRecords } from "@/lib/cms-editor-education";
import { EDITOR_EDUCATION_CATEGORIES, editorEducationPublicPath } from "@/lib/editor-education";

export const dynamic = "force-dynamic";

export default async function EditorEducationDashboardPage() {
  const result = await Promise.allSettled([listEditorEducationGuideRecords()]);
  const records = result[0].status === "fulfilled" ? result[0].value : [];
  const dataError = result[0].status === "rejected";

  const items: EducationWorkbenchItem[] = records.map(({ category, guide, updatedAt }) => ({
    slug: category.slug,
    label: category.title,
    category: "Editörlük Okulu",
    categoryPath: "editorluk-okulu",
    visualCount: Object.keys(guide.visuals).length,
    updatedAt: updatedAt?.toISOString() ?? null,
    editHref: `/icerik/editor-egitim/${category.slug}`,
    publicHref: editorEducationPublicPath(category),
  }));

  const counts = items.map((item) => item.visualCount);
  const complete = counts.filter((count) => count >= 1).length;
  const inProgress = 0;
  const categories: EducationWorkbenchCategory[] = [{
    label: "Editörlük Okulu",
    path: "editorluk-okulu",
    total: EDITOR_EDUCATION_CATEGORIES.length,
    complete,
    inProgress,
    notStarted: Math.max(0, EDITOR_EDUCATION_CATEGORIES.length - complete),
  }];

  return (
    <section className={`content-editor-page ${styles.pageShell}`}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderCopy}>
          <span className={styles.eyebrow}>İçerik · Eğitim</span>
          <h1>Editör Eğitim Merkezi</h1>
          <p>İlkOku Editörlük Okulu’nun 8 ana eğitim sayfasını ve eğitim kapak görsellerini tek çalışma masasından yönet.</p>
        </div>
        <div className={styles.headerMeta}>
          <strong>{dataError ? "—" : EDITOR_EDUCATION_CATEGORIES.length}</strong>
          <span>editör eğitimi</span>
          <span>her eğitimde 1 kapak görseli</span>
        </div>
      </header>

      <nav className={styles.quickNav} aria-label="Editör eğitimi hızlı işlemleri">
        <Link href="/icerik/egitim">Yazar Eğitim Merkezi</Link>
        <Link href="/icerik/okur-egitim">Okur Eğitim Merkezi</Link>
        <Link href="/icerik/medya">Medya</Link>
        <Link href="/editorler-icin" target="_blank">Editörler İçin ↗</Link>
      </nav>

      {dataError ? (
        <div className="content-panel cms-editor-notice is-danger" role="alert">
          <strong>Editör eğitim kayıtları okunamadı.</strong>
          <p>Yanlış hazırlık durumu göstermemek için Editör Eğitim Merkezi güvenli biçimde durduruldu.</p>
          <div className="content-form-actions">
            <Link href="/icerik/saglik">Sistem Sağlığı →</Link>
            <Link href="/icerik/editor-egitim">Tekrar dene ↻</Link>
          </div>
        </div>
      ) : (
        <EducationWorkbench
          items={items}
          categories={categories}
          lockedCategory="Editörlük Okulu"
          visualTarget={1}
          entityLabel="eğitim"
          itemColumnLabel="Eğitim"
          searchPlaceholder="Metin değerlendirme, tür editörlüğü, geri bildirim…"
          inventoryLabel="Editör eğitim envanteri"
          showLockedCategoryBar={false}
        />
      )}
    </section>
  );
}
