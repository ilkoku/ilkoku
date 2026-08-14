import Link from "next/link";
import { saveCmsDocumentAction } from "@/features/cms/document-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { getCmsDraft, pageDraftKey } from "@/lib/cms-drafts";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { cmsLegalContentKey, getCmsLegalDocument } from "@/lib/cms-legal";
import type { CmsLocaleCode } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type PageRow = {
  id: string;
  title: string;
  status: string;
  bodyJson: string;
  seoDescription: string | null;
  updatedAt: Date;
};

type RevisionRow = { total: bigint | number };
type StoredBody = { description?: string; updatedLabel?: string; body?: string };
type DocumentDraft = { title?: string; description?: string; updatedLabel?: string; body?: string };

export async function CmsDocumentEditor({ slug, locale }: { slug: string; locale: CmsLocaleCode }) {
  const access = await requireCmsManager(`/icerik/yasal/${slug}`);
  const document = getCmsLegalDocument(slug);
  if (!document) return null;

  const contentKey = cmsLegalContentKey(document.slug, locale);
  const localeEnabled = await isCmsLocaleEnabled(locale);
  let page: PageRow | null = null;
  let revisionCount = 0;

  try {
    const rows = await prisma.$queryRaw<PageRow[]>`
      SELECT id, title, status, bodyJson, seoDescription, updatedAt
      FROM ContentPage
      WHERE contentKey = ${contentKey}
      LIMIT 1
    `;
    page = rows[0] ?? null;
    if (page) {
      const revisions = await prisma.$queryRaw<RevisionRow[]>`
        SELECT COUNT(*) AS total FROM ContentRevision WHERE pageId = ${page.id}
      `;
      revisionCount = Number(revisions[0]?.total ?? 0);
    }
  } catch {}

  let stored: StoredBody = {};
  if (page?.bodyJson) {
    try { stored = JSON.parse(page.bodyJson) as StoredBody; } catch {}
  }

  const staged = page?.status === "published"
    ? await getCmsDraft<DocumentDraft>(pageDraftKey(page.id)).catch(() => null)
    : null;
  const draft = staged?.payload;
  const hasPendingDraft = Boolean(draft);
  const canPublish = access.canPublish && localeEnabled;
  const isEn = locale === "en";
  const statusLabel = page?.status === "published" && hasPendingDraft
    ? "Yayında · taslak hazır"
    : page?.status ?? "Kayıt yok";

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Belge · {locale.toUpperCase()}</span>
          <h1>{document.title}</h1>
          <p>{isEn ? "İngilizce belge sürümünü Türkçeden bağımsız olarak hazırlayın." : "Taslak kaydedildiğinde mevcut canlı metin korunur; yalnız yayın komutu public sayfayı değiştirir."}</p>
        </div>
        <div className="content-profile">
          <strong>{statusLabel}</strong>
          <small>{revisionCount} CMS sürümü</small>
        </div>
      </div>

      <div className="content-form-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
        <Link href={`/icerik/yasal/${slug}?dil=tr`}>Türkçe</Link>
        <Link href={`/icerik/yasal/${slug}?dil=en`}>English</Link>
        <Link href={`/icerik/onizleme/yasal/${slug}?dil=${locale}`}>Taslağı Önizle ↗</Link>
        <Link href={`/icerik/yasal?dil=${locale}`}>← Belge listesi</Link>
      </div>

      {hasPendingDraft ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>Bekleyen çalışma taslağı var.</strong>
          <p>Public sayfa hâlâ son yayınlanmış sürümü gösteriyor. Taslağı önizleyebilir veya yayın yetkisiyle canlıya aktarabilirsiniz.</p>
        </div>
      ) : null}

      {isEn && !localeEnabled ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>EN yayın kilitli.</strong>
          <p>Bu belge taslak olarak kaydedilebilir ve önizlenebilir. İngilizce public dili açılmadan yayınlanamaz.</p>
        </div>
      ) : null}

      <div className="content-panel">
        <form action={saveCmsDocumentAction} className="content-form">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="locale" value={locale} />
          <label>
            <span>Sayfa başlığı</span>
            <input name="title" required maxLength={220} defaultValue={draft?.title ?? page?.title ?? (isEn ? "" : document.title)} />
          </label>
          <label>
            <span>Kısa açıklama</span>
            <textarea name="description" rows={3} maxLength={500} defaultValue={draft?.description ?? stored.description ?? page?.seoDescription ?? ""} />
          </label>
          <label>
            <span>Son güncelleme etiketi</span>
            <input name="updatedLabel" maxLength={120} defaultValue={draft?.updatedLabel ?? stored.updatedLabel ?? ""} placeholder={isEn ? "14 August 2026" : "14 Ağustos 2026"} />
          </label>
          <label>
            <span>Metin</span>
            <textarea
              name="body"
              required
              rows={28}
              defaultValue={draft?.body ?? stored.body ?? ""}
              placeholder={"## 1. Bölüm başlığı\n\nParagraf metni.\n\n- Liste maddesi\n- Liste maddesi"}
            />
          </label>
          <p className="content-form-help">Bölüm başlığı için ##, liste maddesi için - kullanabilirsiniz. Taslak kaydı canlı içeriği değiştirmez ve Revision Center'a yeni sürüm ekler.</p>
          <div className="content-form-actions">
            <button type="submit" name="mode" value="draft">Taslak Kaydet</button>
            {canPublish ? <button type="submit" name="mode" value="publish">Kaydet ve Yayınla</button> : null}
          </div>
        </form>
      </div>
    </section>
  );
}
