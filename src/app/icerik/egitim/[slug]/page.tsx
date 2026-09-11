import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { removeEducationGuideVisualAction, saveEducationGuideMetaAction } from "@/features/cms/education-actions";
import { requireCmsManager } from "@/lib/cms-access";
import {
  EDUCATION_VISUAL_SLOTS,
  educationCategoryPath,
  educationGithubMediaFolder,
  educationGuideDefault,
  educationMediaFolder,
  educationPublicPath,
  getEducationGuideRecord,
} from "@/lib/cms-education";
import { getGenreBySlug } from "@/lib/genres";

import EducationVisualUploadForm from "./EducationVisualUploadForm";
import styles from "./EducationGuideEditor.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EducationGuideEditorPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const genre = getGenreBySlug(slug);
  if (!genre) notFound();

  await requireCmsManager(`/icerik/egitim/${genre.slug}`);
  const guide = await getEducationGuideRecord(genre.slug) ?? educationGuideDefault(genre);
  const uploaded = queryValue(query.yuklendi);
  const removed = queryValue(query.kaldirildi);
  const saved = queryValue(query.kaydedildi);
  const error = queryValue(query.hata);
  const publicPath = educationPublicPath(genre);
  const mediaFolder = educationMediaFolder(genre);
  const githubMediaFolder = educationGithubMediaFolder(genre);
  const visualCount = Object.keys(guide.visuals).length;

  return (
    <section className={`content-editor-page ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Eğitim · {genre.category}</span>
          <h1>{genre.label}</h1>
          <p>{publicPath}</p>
        </div>
        <div className={styles.progress}>
          <strong>{visualCount}/7</strong>
          <span>görsel hazır</span>
        </div>
      </header>

      <nav className={styles.toolbar} aria-label="Eğitim sayfası hızlı işlemleri">
        <div className={styles.toolbarGroup}>
          <Link href="/icerik/egitim">← Eğitim</Link>
          <Link href={`/icerik/egitim/kategori/${educationCategoryPath(genre.category)}`}>{genre.category}</Link>
          <Link href="/icerik/medya">Medya</Link>
        </div>
        <div className={styles.toolbarGroup}>
          {genre.slug === "roman" ? <Link href={publicPath} target="_blank">Canlı sayfa ↗</Link> : <span>{publicPath}</span>}
        </div>
      </nav>

      {saved ? <div className={styles.notice}><strong>Sayfa bilgileri kaydedildi.</strong></div> : null}
      {uploaded ? <div className={styles.notice}><strong>{uploaded} görsel slotu yüklendi.</strong> Orijinal dosya korunur; yeniden boyutlandırma, sıkıştırma veya format dönüşümü yapılmaz.</div> : null}
      {removed ? <div className={styles.notice}><strong>{removed} görsel bağlantısı kaldırıldı.</strong> Dosya Medya Kütüphanesi’nde kalır.</div> : null}
      {error ? <div className={styles.notice}><strong>İşlem tamamlanamadı: {error}</strong></div> : null}

      <section className={styles.metaPanel}>
        <div className={styles.panelTitle}>
          <h2>Sayfa bilgisi</h2>
          <p>Başlık ve kısa özet</p>
        </div>
        <form action={saveEducationGuideMetaAction} className={styles.metaForm}>
          <input type="hidden" name="genreSlug" value={genre.slug} />
          <label className={styles.field}>
            <span>Başlık</span>
            <input name="title" required maxLength={220} defaultValue={guide.title} />
          </label>
          <label className={styles.field}>
            <span>Özet</span>
            <textarea name="summary" required maxLength={1200} defaultValue={guide.summary} rows={2} />
          </label>
          <button className={styles.saveButton} type="submit">Kaydet</button>
        </form>
      </section>

      <section className={styles.visualPanel}>
        <div className={styles.visualPanelHeader}>
          <div>
            <h2>7 görsel slotu</h2>
            <p>PNG, JPEG, WebP, GIF, AVIF · dosya başına 3 MB · çözünürlük ve oran yüklemeden önce kontrol edilir</p>
          </div>
          <div className={styles.depot}>
            <span>Canlı depo: <code>{mediaFolder}</code></span>
            <span>GitHub kaynak: <code>{githubMediaFolder}</code></span>
          </div>
        </div>
        <div className={styles.slotHeader} aria-hidden="true">
          <span>No</span>
          <span>Slot / kalite kuralı</span>
          <span>Mevcut görsel</span>
          <span>Yükle / değiştir</span>
        </div>

        {EDUCATION_VISUAL_SLOTS.map((slot) => {
          const visual = guide.visuals[slot.key];
          return (
            <article className={styles.slotRow} key={slot.key}>
              <div className={styles.slotNo}>{slot.number}</div>
              <div className={styles.slotInfo}>
                <strong>{slot.label}</strong>
                <p>{slot.description}</p>
                <div className={styles.slotSpecs}>
                  <span>Min. {slot.recommendedWidth}×{slot.recommendedHeight} px</span>
                  <span>{slot.aspectRatio}</span>
                  <span>Orijinal korunur</span>
                </div>
                <small className={styles.automationNote}>Kalite: {slot.automation}</small>
              </div>

              {visual ? (
                <div className={styles.preview}>
                  <div className={styles.previewImage} style={{ aspectRatio: `${slot.recommendedWidth} / ${slot.recommendedHeight}` }}>
                    <Image
                      src={visual.url}
                      alt={visual.altText || `${genre.label} ${slot.label}`}
                      width={slot.recommendedWidth}
                      height={slot.recommendedHeight}
                      unoptimized
                    />
                  </div>
                  <div className={styles.previewText}>
                    <strong>Yüklü · orijinal kalite</strong>
                    <small>{visual.filename || visual.url}</small>
                    <small>{visual.altText || "Alt metin yok"}</small>
                    <small>{visual.sourceWidth && visual.sourceHeight ? `Kaynak ${visual.sourceWidth}×${visual.sourceHeight} px` : "Kaynak çözünürlüğü eski kayıtta yok"}</small>
                    <small>Hedef min. {visual.recommendedWidth}×{visual.recommendedHeight} · {visual.aspectRatio}</small>
                  </div>
                </div>
              ) : (
                <div className={styles.emptyPreview}>Henüz görsel yüklenmedi.</div>
              )}

              <div className={styles.slotActions}>
                <EducationVisualUploadForm
                  genreSlug={genre.slug}
                  slotKey={slot.key}
                  slotLabel={`${genre.label} · ${slot.label}`}
                  recommendedWidth={slot.recommendedWidth}
                  recommendedHeight={slot.recommendedHeight}
                  defaultAltText={visual?.altText ?? ""}
                  hasVisual={Boolean(visual)}
                />

                {visual ? (
                  <form action={removeEducationGuideVisualAction}>
                    <input type="hidden" name="genreSlug" value={genre.slug} />
                    <input type="hidden" name="slot" value={slot.key} />
                    <button className={styles.removeButton} type="submit">Kaldır</button>
                  </form>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}
