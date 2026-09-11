import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { removeEducationGuideVisualAction, saveEducationGuideMetaAction } from "@/features/cms/education-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { EDUCATION_VISUAL_SLOTS, educationGuideDefault, educationPublicPath, getEducationGuideRecord } from "@/lib/cms-education";
import { getGenreBySlug } from "@/lib/genres";

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
  const visualCount = Object.keys(guide.visuals).length;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>İçerik · Eğitim · {genre.category}</span>
          <h1>{genre.label}</h1>
          <p>{publicPath} için içerik ve 7 ana eğitim görselini yönet.</p>
        </div>
        <aside className="cms-editor-status-card" data-tone={visualCount === 7 ? "success" : "warning"}>
          <span className="cms-editor-status-card__label">Görsel hazırlığı</span>
          <strong>{visualCount}/7</strong>
          <div className="cms-editor-status-card__meta">
            <span className="cms-editor-chip">{genre.category}</span>
            <span className="cms-editor-chip is-warning">PC’den manuel yükleme</span>
          </div>
        </aside>
      </div>

      <nav className="cms-editor-toolbar" aria-label="Eğitim sayfası hızlı işlemleri">
        <div className="cms-editor-toolbar__cluster">
          <Link href="/icerik/egitim">← Eğitim listesi</Link>
          <Link href="/icerik/medya">Medya Kütüphanesi</Link>
        </div>
        <div className="cms-editor-toolbar__cluster">
          {genre.slug === "roman" ? <Link href={publicPath} target="_blank">Canlı sayfayı aç ↗</Link> : <span>Public URL: {publicPath}</span>}
        </div>
      </nav>

      {saved ? <div className="content-panel cms-editor-notice is-success"><strong>Sayfa bilgileri kaydedildi.</strong></div> : null}
      {uploaded ? <div className="content-panel cms-editor-notice is-success"><strong>{uploaded} görsel slotu yüklendi ve bağlandı.</strong></div> : null}
      {removed ? <div className="content-panel cms-editor-notice is-info"><strong>{removed} görsel bağlantısı kaldırıldı.</strong><p>Dosya Medya Kütüphanesi’nde kalır.</p></div> : null}
      {error ? <div className="content-panel cms-editor-notice is-danger"><strong>İşlem tamamlanamadı: {error}</strong></div> : null}

      <section className="content-panel">
        <div className="content-section-heading">
          <div><span>Sayfa bilgisi</span><h2>Başlık ve özet</h2></div>
          <p>Bu kayıt eğitim modülünün ortak içerik kaynağıdır. Görsellerden bağımsız olarak düzenlenebilir.</p>
        </div>
        <form action={saveEducationGuideMetaAction} className="content-form-grid">
          <input type="hidden" name="genreSlug" value={genre.slug} />
          <label>
            <span>Sayfa başlığı</span>
            <input name="title" required maxLength={220} defaultValue={guide.title} />
          </label>
          <label>
            <span>Sayfa özeti</span>
            <textarea name="summary" required maxLength={1200} defaultValue={guide.summary} rows={4} />
          </label>
          <div className="content-form-actions"><button type="submit">Bilgileri Kaydet</button></div>
        </form>
      </section>

      <section className="content-panel" style={{ marginTop: "1rem" }}>
        <div className="content-section-heading">
          <div><span>Görsel yönetimi</span><h2>7 ana görsel slotu</h2></div>
          <p>Dosyayı bilgisayarından seç. PNG, JPEG, WebP, GIF veya AVIF kabul edilir; mevcut medya güvenlik sınırı dosya başına 3 MB’dir.</p>
        </div>

        <div style={{ display: "grid", gap: "1rem" }}>
          {EDUCATION_VISUAL_SLOTS.map((slot) => {
            const visual = guide.visuals[slot.key];
            return (
              <article className="content-list-row" key={slot.key} style={{ alignItems: "stretch", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ width: 110, flex: "0 0 110px" }}>
                  <strong>{slot.number}</strong><br />
                  <small>{slot.label}</small>
                </div>

                <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                  <strong>{slot.label}</strong>
                  <p style={{ margin: ".3rem 0 .75rem" }}>{slot.description}</p>
                  {visual ? (
                    <div style={{ border: "1px solid var(--content-border, #ddd)", borderRadius: 12, padding: 10, background: "#fff" }}>
                      <Image
                        src={visual.url}
                        alt={visual.altText || `${genre.label} ${slot.label}`}
                        width={1200}
                        height={800}
                        unoptimized
                        style={{ width: "100%", height: "auto", maxHeight: 420, objectFit: "contain", display: "block" }}
                      />
                      <small style={{ display: "block", marginTop: 8 }}>{visual.filename || visual.url}</small>
                    </div>
                  ) : (
                    <div className="content-empty-state"><strong>Henüz görsel yok.</strong><p>Bu slot boş; aşağıdan bilgisayarından dosya seç.</p></div>
                  )}
                </div>

                <div style={{ flex: "1 1 340px" }}>
                  <form action="/api/cms-education-media-upload" method="post" encType="multipart/form-data" className="content-form-grid">
                    <input type="hidden" name="genreSlug" value={genre.slug} />
                    <input type="hidden" name="slot" value={slot.key} />
                    <label>
                      <span>Bilgisayardan görsel seç</span>
                      <input name="file" type="file" required accept="image/png,image/jpeg,image/webp,image/gif,image/avif" />
                    </label>
                    <label>
                      <span>Alt metin</span>
                      <input name="altText" maxLength={300} defaultValue={visual?.altText ?? ""} placeholder={`${genre.label} ${slot.label} açıklaması`} />
                    </label>
                    <div className="content-form-actions"><button type="submit">{visual ? "Görseli Değiştir" : "Görseli Yükle"}</button></div>
                  </form>

                  {visual ? (
                    <form action={removeEducationGuideVisualAction} style={{ marginTop: ".65rem" }}>
                      <input type="hidden" name="genreSlug" value={genre.slug} />
                      <input type="hidden" name="slot" value={slot.key} />
                      <button type="submit">Slot bağlantısını kaldır</button>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
