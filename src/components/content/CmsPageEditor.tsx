import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveCmsPageAction, saveCmsPageAction } from "@/features/cms/page-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { getCmsDraft, pageDraftKey } from "@/lib/cms-drafts";
import { parseCmsPageBody } from "@/lib/cms-pages";
import { prisma } from "@/lib/prisma";

type PageRow = {
  id: string;
  contentKey: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  bodyJson: string;
  seoTitle: string | null;
  seoDescription: string | null;
  noIndex: boolean;
  updatedAt: Date;
};

type PageDraft = {
  title?: string;
  summary?: string;
  body?: string;
  seoTitle?: string;
  seoDescription?: string;
  noIndex?: boolean;
};

export async function CmsPageEditor({ id }: { id?: string }) {
  const access = await requireCmsManager(id ? `/icerik/sayfalar/${id}` : "/icerik/sayfalar/yeni");
  let page: PageRow | null = null;
  let revisionCount = 0;

  if (id) {
    const rows = await prisma.$queryRaw<PageRow[]>`
      SELECT id, contentKey, slug, title, status, bodyJson, seoTitle, seoDescription, noIndex, updatedAt
      FROM ContentPage
      WHERE id = ${id}
        AND contentKey LIKE 'page:tr:%'
      LIMIT 1
    `;
    page = rows[0] ?? null;
    if (!page) notFound();
    const revisions = await prisma.$queryRaw<Array<{ total: number | bigint }>>`
      SELECT COUNT(*) AS total FROM ContentRevision WHERE pageId = ${page.id}
    `;
    revisionCount = Number(revisions[0]?.total ?? 0);
  }

  const stored = parseCmsPageBody(page?.bodyJson ?? "{}");
  const staged = page?.status === "published"
    ? await getCmsDraft<PageDraft>(pageDraftKey(page.id)).catch(() => null)
    : null;
  const draft = staged?.payload;
  const hasPendingDraft = Boolean(draft);
  const slugPart = page?.slug.replace(/^\//, "") ?? "";
  const statusLabel = page?.status === "published" && hasPendingDraft
    ? "Yayında · taslak hazır"
    : page?.status === "published" ? "Yayında" : page?.status === "archived" ? "Arşiv" : "Taslak";

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Kurumsal Sayfa · TR</span>
          <h1>{page ? (draft?.title ?? page.title) : "Yeni kurumsal sayfa"}</h1>
          <p>Kurumsal ve bilgilendirme sayfalarını kod değişikliği olmadan yönetin. Yayındaki sürüm, yeni taslak açıkça yayınlanana kadar korunur.</p>
        </div>
        <div className="content-profile">
          <strong>{statusLabel}</strong>
          <small>{page ? `${revisionCount} sürüm` : "Yeni içerik"}</small>
        </div>
      </div>

      <div className="content-form-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
        {page ? <Link href={`/icerik/onizleme/sayfa/${page.id}`}>Taslağı Önizle ↗</Link> : null}
        {page?.status === "published" ? <Link href={page.slug} target="_blank">Canlı sayfayı aç ↗</Link> : null}
        <Link href="/icerik/sayfalar">← Sayfa listesi</Link>
      </div>

      {hasPendingDraft ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>Bekleyen çalışma taslağı var.</strong>
          <p>Public sayfa son yayınlanmış sürümü göstermeye devam ediyor. Taslağı önizleyip hazır olduğunda yayınlayabilirsiniz.</p>
        </div>
      ) : null}

      <div className="content-panel">
        <form action={saveCmsPageAction} className="content-form">
          {page ? <input type="hidden" name="id" value={page.id} /> : null}

          <label>
            <span>URL kısa adı</span>
            <input name="slug" required maxLength={120} defaultValue={slugPart} readOnly={Boolean(page)} placeholder="hakkimizda" />
          </label>
          <p className="content-form-help">Yalnız a-z, 0-9 ve tire. İlk kayıttan sonra URL sabitlenir. Ürün ve yönetim rotaları kullanılamaz.</p>

          <label>
            <span>Başlık</span>
            <input name="title" required maxLength={220} defaultValue={draft?.title ?? page?.title ?? ""} />
          </label>

          <label>
            <span>Kısa özet</span>
            <textarea name="summary" rows={4} maxLength={500} defaultValue={draft?.summary ?? stored.summary} />
          </label>

          <label>
            <span>Sayfa metni</span>
            <textarea name="body" required rows={24} defaultValue={draft?.body ?? stored.body} placeholder={"İlk paragraf.\n\nİkinci paragraf.\n\n## Ara başlık\n\nAçıklama metni."} />
          </label>

          <label>
            <span>SEO başlığı</span>
            <input name="seoTitle" maxLength={220} defaultValue={draft?.seoTitle ?? page?.seoTitle ?? ""} />
          </label>

          <label>
            <span>SEO açıklaması</span>
            <textarea name="seoDescription" rows={3} maxLength={500} defaultValue={draft?.seoDescription ?? page?.seoDescription ?? ""} />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: ".7rem" }}>
            <input name="noIndex" type="checkbox" defaultChecked={draft?.noIndex ?? Boolean(page?.noIndex)} style={{ width: "auto" }} />
            <span>Arama motorlarında gösterme (noindex)</span>
          </label>

          <div className="content-form-actions" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <Link href="/icerik/sayfalar">← Sayfa listesi</Link>
            <div style={{ display: "flex", gap: ".7rem", flexWrap: "wrap" }}>
              <button type="submit" name="mode" value="draft">Taslak Kaydet</button>
              {access.canPublish ? <button type="submit" name="mode" value="publish">Kaydet ve Yayınla</button> : null}
            </div>
          </div>
        </form>

        {page ? (
          <div className="content-publish-box">
            <div>
              <strong>Arşivleme</strong>
              <p>Arşivlenen kurumsal sayfa public siteden kaldırılır; sürüm geçmişi korunur.</p>
            </div>
            <form action={archiveCmsPageAction}>
              <input type="hidden" name="id" value={page.id} />
              <button type="submit">Arşivle</button>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}
