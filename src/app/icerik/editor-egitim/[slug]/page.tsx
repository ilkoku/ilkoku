import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  discardEditorEducationTextDraftAction,
  removeEditorEducationGuideVisualAction,
  restoreEditorEducationTextRevisionAction,
  saveEditorEducationTextAction,
} from "@/features/cms/editor-education-actions";
import { requireCmsManager } from "@/lib/cms-access";
import {
  editorEducationGithubMediaFolder,
  editorEducationGuideDefault,
  editorEducationMediaFolder,
  getEditorEducationDraftTextRecord,
  getEditorEducationGuideRecord,
  getEditorEducationPublishedTextRecord,
  listEditorEducationTextRevisions,
} from "@/lib/cms-editor-education";
import {
  EDITOR_EDUCATION_VISUAL_SLOTS,
  editorEducationPublicPath,
  getEditorEducationCategory,
} from "@/lib/editor-education";
import { getEditorEducationSourceTree } from "@/lib/editor-education-source";
import {
  collectEditorEducationTextFields,
  type EditorEducationTextField,
} from "@/lib/editor-education-text";

import styles from "../../egitim/[slug]/EducationGuideEditor.module.css";
import EditorEducationVisualUploadForm from "./EditorEducationVisualUploadForm";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type TextFieldGroup = {
  title: string;
  fields: EditorEducationTextField[];
};

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function groupEditorEducationTextFields(fields: EditorEducationTextField[]): TextFieldGroup[] {
  const groups: TextFieldGroup[] = [];
  let current: TextFieldGroup = { title: "Giriş ve üst alan", fields: [] };

  for (const field of fields) {
    const startsSection = field.kind === "heading" && field.label.startsWith("H2 ·");
    if (startsSection && current.fields.length > 0) {
      groups.push(current);
      current = { title: field.value, fields: [field] };
      continue;
    }
    current.fields.push(field);
  }

  if (current.fields.length > 0) groups.push(current);
  return groups;
}

function friendlyFieldName(field: EditorEducationTextField) {
  if (field.kind === "heading") {
    return field.label.startsWith("H1 ·") ? "Ana başlık" : "Bölüm başlığı";
  }
  if (field.kind === "paragraph") return "Metin";
  if (field.kind === "label") return "Etiket / kısa ifade";
  if (field.kind === "link") return "Bağlantı / CTA";
  return "Metin";
}

export default async function EditorEducationGuideEditorPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = getEditorEducationCategory(slug);
  if (!category) notFound();

  await requireCmsManager(`/icerik/editor-egitim/${category.slug}`);
  const [guideResult, sourceTree, draft, published, revisions] = await Promise.all([
    getEditorEducationGuideRecord(category.slug),
    getEditorEducationSourceTree(category.slug),
    getEditorEducationDraftTextRecord(category.slug),
    getEditorEducationPublishedTextRecord(category.slug),
    listEditorEducationTextRevisions(category.slug, 10),
  ]);
  if (!sourceTree) notFound();

  const guide = guideResult ?? editorEducationGuideDefault(category);
  const textFields = collectEditorEducationTextFields(sourceTree);
  const textGroups = groupEditorEducationTextFields(textFields);
  const activeText = draft ?? published;
  const activeOverrides = activeText?.overrides ?? {};
  const changedCount = Object.keys(activeOverrides).length;
  const uploaded = queryValue(query.yuklendi);
  const removed = queryValue(query.kaldirildi);
  const error = queryValue(query.hata);
  const savedDraft = queryValue(query.taslak);
  const publishedNow = queryValue(query.yayin);
  const restoredVersion = queryValue(query.surum);
  const draftDeleted = queryValue(query["taslak-silindi"]);
  const publicPath = editorEducationPublicPath(category);
  const mediaFolder = editorEducationMediaFolder(category);
  const githubMediaFolder = editorEducationGithubMediaFolder(category);
  const textFormId = "editor-education-text-form";

  return (
    <section className={`content-editor-page ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Editör Eğitimi · İlkOku Editörlük Okulu</span>
          <h1>{category.title}</h1>
          <p>{publicPath}</p>
        </div>
        <div className={styles.progress}>
          <strong>{changedCount}/{textFields.length}</strong>
          <span>{draft ? "taslak değişiklik" : `yayın v${published?.version ?? 0}`}</span>
        </div>
      </header>

      <nav className={styles.toolbar} aria-label="Editör eğitimi hızlı işlemleri">
        <div className={styles.toolbarGroup}>
          <Link href="/icerik/editor-egitim">← Editör Eğitim Merkezi</Link>
          <Link href="/icerik/medya">Medya</Link>
        </div>
        <div className={styles.toolbarGroup}>
          <Link href={`/icerik/onizleme/editor-egitim/${category.slug}`} target="_blank">Taslak Önizleme ↗</Link>
          <Link href={publicPath} target="_blank">Canlı sayfa ↗</Link>
        </div>
      </nav>

      {savedDraft ? <div className={styles.notice}><strong>Taslak kaydedildi.</strong> Canlı eğitim değişmedi; önizlemeden kontrol edip yayınlayabilirsin.</div> : null}
      {publishedNow ? <div className={styles.notice}><strong>Metin değişiklikleri yayınlandı.</strong> Canlı eğitim yeni yayın sürümünü kullanıyor.</div> : null}
      {restoredVersion ? <div className={styles.notice}><strong>v{restoredVersion} taslağa geri alındı.</strong> Canlı sayfa değişmedi; önce önizle.</div> : null}
      {draftDeleted ? <div className={styles.notice}><strong>Taslak silindi.</strong> Form yeniden son yayınlanmış sürümü gösteriyor.</div> : null}
      {uploaded ? <div className={styles.notice}><strong>{uploaded} görsel slotu yüklendi.</strong> Orijinal dosya korunur; yeniden boyutlandırma, sıkıştırma veya format dönüşümü yapılmaz.</div> : null}
      {removed ? <div className={styles.notice}><strong>{removed} görsel bağlantısı kaldırıldı.</strong> Dosya Medya Kütüphanesi’nde kalır.</div> : null}
      {error ? <div className={styles.notice}><strong>İşlem tamamlanamadı: {error}</strong></div> : null}

      <section className="content-panel" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <span className={styles.eyebrow}>Metin Yönetimi</span>
            <h2 style={{ margin: ".4rem 0" }}>Taslak → Önizleme → Yayınla</h2>
            <p style={{ maxWidth: "760px", margin: 0 }}>
              Metinler eğitimdeki bölümlere göre gruplanır. Yalnız değiştirmek istediğin bölümü açman yeterli. Tasarım, kart düzeni, link hedefleri, canonical ve Google index ayarları kod kontrollü kalır.
            </p>
          </div>
          <div style={{ display: "grid", gap: ".2rem", textAlign: "right" }}>
            <strong>{draft ? "Çalışma taslağı var" : "Taslak yok"}</strong>
            <small>Canlı sürüm: v{published?.version ?? 0}</small>
            <small>{textGroups.length} bölüm · {textFields.length} metin alanı</small>
          </div>
        </div>
      </section>

      <section
        className="content-panel"
        style={{
          position: "sticky",
          top: "1rem",
          zIndex: 8,
          marginBottom: "1rem",
          padding: ".85rem 1rem",
          boxShadow: "0 10px 28px rgba(30, 22, 52, .09)",
        }}
        aria-label="Metin düzenleme işlemleri"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: ".1rem" }}>
            <strong>{draft ? "Taslak üzerinde çalışıyorsun" : "Canlı sürümden başlıyorsun"}</strong>
            <small>{changedCount > 0 ? `${changedCount} değiştirilmiş alan` : "Henüz değiştirilmiş alan yok"}</small>
          </div>
          <div className="content-form-actions" style={{ margin: 0, flexWrap: "wrap" }}>
            <button form={textFormId} type="submit" name="mode" value="draft">Taslağı Kaydet</button>
            <Link href={`/icerik/onizleme/editor-egitim/${category.slug}`} target="_blank">Taslak Önizleme ↗</Link>
            <button form={textFormId} type="submit" name="mode" value="publish">Yayınla</button>
          </div>
        </div>
      </section>

      <form id={textFormId} action={saveEditorEducationTextAction} style={{ marginBottom: "1rem" }}>
        <input type="hidden" name="categorySlug" value={category.slug} />
        <div style={{ display: "grid", gap: ".8rem" }}>
          {textGroups.map((group, groupIndex) => {
            const groupChangedCount = group.fields.filter((item) => {
              const value = activeOverrides[item.key] ?? item.value;
              return value !== item.value;
            }).length;

            return (
              <details
                key={`${group.title}-${groupIndex}`}
                className="content-panel"
                open={groupIndex === 0 || groupChangedCount > 0}
                style={{ padding: 0, overflow: "clip" }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    padding: "1rem 1.15rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <span style={{ display: "grid", gap: ".2rem" }}>
                    <strong>{group.title}</strong>
                    <small>{group.fields.length} düzenlenebilir alan</small>
                  </span>
                  {groupChangedCount > 0 ? <small>{groupChangedCount} DEĞİŞİKLİK</small> : null}
                </summary>

                <div style={{ display: "grid", gap: "1rem", padding: "0 1.15rem 1.15rem" }}>
                  {group.fields.map((item, index) => {
                    const value = activeOverrides[item.key] ?? item.value;
                    const changed = value !== item.value;
                    return (
                      <label
                        key={item.key}
                        style={{
                          display: "grid",
                          gap: ".45rem",
                          paddingTop: ".9rem",
                          borderTop: index === 0 ? "1px solid rgba(42,35,56,.08)" : "1px solid rgba(42,35,56,.08)",
                        }}
                      >
                        <span style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "baseline" }}>
                          <strong>{friendlyFieldName(item)}</strong>
                          {changed ? <small>DEĞİŞTİRİLDİ</small> : null}
                        </span>
                        <textarea
                          name={`text_${item.key}`}
                          defaultValue={value}
                          rows={item.kind === "heading" || item.kind === "link" || item.kind === "label" ? 2 : 4}
                          maxLength={12000}
                          style={{ width: "100%", resize: "vertical", minHeight: item.kind === "paragraph" ? "7rem" : undefined }}
                        />
                        {changed ? <small>Orijinal metin: {item.value}</small> : null}
                      </label>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </form>

      {draft ? (
        <details className="content-panel" style={{ marginBottom: "1rem" }}>
          <summary style={{ cursor: "pointer" }}><strong>Taslak yönetimi</strong></summary>
          <form action={discardEditorEducationTextDraftAction} style={{ marginTop: "1rem" }}>
            <input type="hidden" name="categorySlug" value={category.slug} />
            <p>Bu işlem yalnız yayınlanmamış taslağı siler; canlı sürüme dokunmaz.</p>
            <button type="submit">Taslağı Sil</button>
          </form>
        </details>
      ) : null}

      <details className="content-panel" style={{ marginBottom: "1rem" }}>
        <summary style={{ cursor: "pointer" }}>
          <strong>Yayın geçmişi</strong>
          <small style={{ marginLeft: ".65rem" }}>{revisions.length} kayıt</small>
        </summary>
        <div style={{ marginTop: "1rem" }}>
          <p style={{ marginTop: 0 }}>Eski bir yayını doğrudan canlıya basmak yerine güvenli biçimde bu eğitim için taslağa geri al.</p>
          {revisions.length === 0 ? (
            <p>Henüz CMS üzerinden yayınlanmış metin sürümü yok. Mevcut kod içeriği güvenli başlangıç sürümüdür.</p>
          ) : (
            <div style={{ display: "grid", gap: ".65rem", marginTop: "1rem" }}>
              {revisions.map((revision) => (
                <div key={revision.contentKey} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", padding: ".85rem 1rem", border: "1px solid rgba(42,35,56,.08)", borderRadius: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <strong>v{revision.version}</strong>
                    <div><small>{formatDate(revision.createdAt)} · {Object.keys(revision.overrides).length} değiştirilmiş alan</small></div>
                  </div>
                  <form action={restoreEditorEducationTextRevisionAction}>
                    <input type="hidden" name="categorySlug" value={category.slug} />
                    <input type="hidden" name="revisionKey" value={revision.contentKey} />
                    <button type="submit">Taslağa Geri Al</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>

      <details className="content-panel" style={{ padding: 0, overflow: "clip" }}>
        <summary style={{ cursor: "pointer", padding: "1rem 1.15rem" }}>
          <strong>Kapak görseli</strong>
          <small style={{ marginLeft: ".65rem" }}>İsteğe bağlı medya yönetimi</small>
        </summary>
        <section className={styles.visualPanel} style={{ margin: 0 }}>
          <div className={styles.visualPanelHeader}>
            <div>
              <h2>Editör eğitimi kapak görseli</h2>
              <p>PNG, JPEG, WebP, GIF, AVIF · dosya başına 3 MB · yüklenen görsel canlı eğitim menüsünde aktif dersin altında gösterilir.</p>
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

          {EDITOR_EDUCATION_VISUAL_SLOTS.map((slot) => {
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
                  <div className={styles.emptyPreview}>Henüz görsel yüklenmedi. Canlı sayfada boş alan oluşmaz.</div>
                )}

                <div className={styles.slotActions}>
                  <EditorEducationVisualUploadForm
                    categorySlug={category.slug}
                    slotKey={slot.key}
                    slotLabel={`${category.title} · ${slot.label}`}
                    recommendedWidth={slot.recommendedWidth}
                    recommendedHeight={slot.recommendedHeight}
                    defaultAltText={visual?.altText ?? ""}
                    hasVisual={Boolean(visual)}
                  />

                  {visual ? (
                    <form action={removeEditorEducationGuideVisualAction}>
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
      </details>
    </section>
  );
}
