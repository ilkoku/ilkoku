import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  removeReaderEducationGuideVisualAction,
  saveReaderEducationGuideMetaAction,
} from "@/features/cms/reader-education-actions";
import { requireCmsManager } from "@/lib/cms-access";
import {
  getReaderEducationGuideRecord,
  readerEducationGithubMediaFolder,
  readerEducationGuideDefault,
  readerEducationMediaFolder,
} from "@/lib/cms-reader-education";
import {
  READER_EDUCATION_VISUAL_SLOTS,
  getReaderEducationCategory,
  readerEducationPublicPath,
} from "@/lib/reader-education";

import styles from "../../[slug]/EducationGuideEditor.module.css";
import ReaderEducationVisualUploadForm from "./ReaderEducationVisualUploadForm";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReaderEducationGuideEditorPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = getReaderEducationCategory(slug);
  if (!category) notFound();

  await requireCmsManager(`/icerik/okur-egitim/${category.slug}`);
  const guide = await getReaderEducationGuideRecord(category.slug) ?? readerEducationGuideDefault(category);
  const uploaded = queryValue(query.yuklendi);
  const removed = queryValue(query.kaldirildi);
  const saved = queryValue(query.kaydedildi);
  const error = queryValue(query.hata);
  const publicPath = readerEducationPublicPath(category);
  const mediaFolder = readerEducationMediaFolder(category);
  const githubMediaFolder = readerEducationGithubMediaFolder(category);
  const visualCount = Object.keys(guide.visuals).length;

  return (
    <section className={`content-editor-page ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Okur Eğitimi · Okurluk Okulu</span>
          <h1>{category.title}</h1>
          <p>{publicPath}</p>
        </div>
        <div className={styles.progress}>
          <strong>{visualCount}/6</strong>
          <span>görsel hazır</span>
        </div>
      </header>

      <nav className={styles.toolbar} aria-label="Okur eğitimi hızlı işlemleri">
        <div className={styles.toolbarGroup}>
          <Link href="/icerik/okur-egitim">← Okur Eğitim Merkezi</Link>
          <Link href="/icerik/medya">Medya</Link>
        </div>
        <div className={styles.toolbarGroup}>
          <Link href={publicPath} target="_blank">Canlı sayfa ↗</Link>
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
        <form action={saveReaderEducationGuideMetaAction} className={styles.metaForm}>
          <input type="hidden" name="categorySlug" value={category.slug} />
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
            <h2>6 gelecekteki görsel slotu</h2>
            <p>Şimdilik görsel zorunlu değil. PNG, JPEG, WebP, GIF, AVIF · dosya başına 3 MB · yükleme daha sonra bu ekrandan yapılacak.</p>
          </div>
          <div className={styles.depot}>
            <span>Canlı depo: <code>{mediaFolder}</code></span>
            <span>GitHub kaynak: <code>{githubMediaFolder}</code></span>
          </div>
        </div>
        <div className={styles.slotHeader} aria-hidden="true">
          <span>No</span>
          <span>Slot</span>
          <span>Mevcut görsel</span>
          <span>Yükle / değiştir</span>
        </div>

        {READER_EDUCATION_VISUAL_SLOTS.map((slot) => {
          const visual = guide.visuals[slot.key];
          const sourceLabel = visual
            ? visual.sourceWidth && visual.sourceHeight
              ? `${visual.sourceWidth}×${visual.sourceHeight} px`
              : "Eski kayıt · ölçü yok"
            : "Henüz görsel yok";

          return (
            <article className={styles.slotRow} key={slot.key}>
              <div className={styles.slotNo}>{slot.number}</div>
              <div className={styles.slotInfo}>
                <strong>{slot.label}</strong>
                <p>{slot.description}</p>
                <div className={styles.slotSpecs}>
                  <span>{slot.aspectRatio}</span>
                  <span>Orijinal korunur</span>
                </div>
              </div>

              {visual ? (
                <div className={styles.preview}>
                  <div className={styles.previewImage} style={{ aspectRatio: `${slot.recommendedWidth} / ${slot.recommendedHeight}` }}>
                    <Image
                      src={visual.url}
                      alt={visual.altText || `${category.title} ${slot.label}`}
                      width={slot.recommendedWidth}
                      height={slot.recommendedHeight}
                      unoptimized
                    />
                  </div>
                  <div className={styles.previewText}>
                    <strong>Yüklü · orijinal kalite</strong>
                    <small>{visual.filename || visual.url}</small>
                    <small>{visual.altText || "Alt metin yok"}</small>
                  </div>
                </div>
              ) : (
                <div className={styles.emptyPreview}>Henüz görsel yüklenmedi. Canlı sayfada bu slot boşluk oluşturmaz.</div>
              )}

              <div className={styles.slotActions}>
                <ReaderEducationVisualUploadForm
                  categorySlug={category.slug}
                  slotKey={slot.key}
                  slotLabel={`${category.title} · ${slot.label}`}
                  recommendedWidth={slot.recommendedWidth}
                  recommendedHeight={slot.recommendedHeight}
                  defaultAltText={visual?.altText ?? ""}
                  hasVisual={Boolean(visual)}
                />

                {visual ? (
                  <form action={removeReaderEducationGuideVisualAction}>
                    <input type="hidden" name="categorySlug" value={category.slug} />
                    <input type="hidden" name="slot" value={slot.key} />
                    <button className={styles.removeButton} type="submit">Kaldır</button>
                  </form>
                ) : null}
              </div>

              <div className={styles.slotMeta}>
                <span><strong>Kalite</strong>{slot.automation}</span>
                <span><strong>Kaynak</strong>{sourceLabel}</span>
                <span><strong>Hedef</strong>Min. {slot.recommendedWidth}×{slot.recommendedHeight} px · {slot.aspectRatio}</span>
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}
