import { saveCmsDocumentAction } from "@/features/cms/document-actions";
import { getCmsLegalDocument } from "@/lib/cms-legal";
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

type StoredBody = {
  description?: string;
  updatedLabel?: string;
  body?: string;
};

export async function CmsDocumentEditor({ slug }: { slug: string }) {
  const document = getCmsLegalDocument(slug);
  if (!document) return null;

  let page: PageRow | null = null;
  let revisionCount = 0;

  try {
    const rows = await prisma.$queryRaw<PageRow[]>`
      SELECT id, title, status, bodyJson, seoDescription, updatedAt
      FROM ContentPage
      WHERE contentKey = ${document.key}
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

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Belge</span>
          <h1>{document.title}</h1>
          <p>Yeni sürümü taslak olarak hazırlayın; yayınlanana kadar mevcut canlı sürüm korunur.</p>
        </div>
        <div className="content-profile">
          <strong>{page?.status ?? "Kod içeriği aktif"}</strong>
          <small>{revisionCount} CMS sürümü</small>
        </div>
      </div>

      <div className="content-panel">
        <form action={saveCmsDocumentAction} className="content-form">
          <input type="hidden" name="slug" value={slug} />
          <label>
            <span>Sayfa başlığı</span>
            <input name="title" required maxLength={220} defaultValue={page?.title ?? document.title} />
          </label>
          <label>
            <span>Kısa açıklama</span>
            <textarea name="description" rows={3} maxLength={500} defaultValue={stored.description ?? page?.seoDescription ?? ""} />
          </label>
          <label>
            <span>Son güncelleme etiketi</span>
            <input name="updatedLabel" maxLength={120} defaultValue={stored.updatedLabel ?? ""} placeholder="13 Ağustos 2026" />
          </label>
          <label>
            <span>Metin</span>
            <textarea
              name="body"
              required
              rows={28}
              defaultValue={stored.body ?? ""}
              placeholder={"## 1. Bölüm başlığı\n\nParagraf metni.\n\n- Liste maddesi\n- Liste maddesi"}
            />
          </label>
          <p className="content-form-help">Bölüm başlığı için ##, liste maddesi için - kullanabilirsiniz. Her kayıtta yeni sürüm kaydı oluşturulur.</p>
          <div className="content-form-actions">
            <button type="submit" name="mode" value="draft">Taslak Kaydet</button>
            <button type="submit" name="mode" value="publish">Kaydet ve Yayınla</button>
          </div>
        </form>
      </div>
    </section>
  );
}
