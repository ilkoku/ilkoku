import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveCmsGuideAction, saveCmsGuideAction } from "@/features/cms/guide-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { parseGuideBody } from "@/lib/cms-guides";
import { prisma } from "@/lib/prisma";

type GuideRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  bodyJson: string;
  seoTitle: string | null;
  seoDescription: string | null;
  noIndex: boolean;
  updatedAt: Date;
};

type RevisionRow = { total: number | bigint };

export async function CmsGuideEditor({ id }: { id?: string }) {
  const access = await requireCmsManager(id ? `/icerik/rehber/${id}` : "/icerik/rehber/yeni");
  let guide: GuideRow | null = null;
  let revisionCount = 0;

  if (id) {
    try {
      const rows = await prisma.$queryRaw<GuideRow[]>`
        SELECT id, slug, title, status, bodyJson, seoTitle, seoDescription, noIndex, updatedAt
        FROM ContentPage
        WHERE id = ${id}
          AND contentKey LIKE 'guide:%'
        LIMIT 1
      `;
      guide = rows[0] ?? null;
    } catch {
      guide = null;
    }
    if (!guide) notFound();

    const revisions = await prisma.$queryRaw<RevisionRow[]>`
      SELECT COUNT(*) AS total FROM ContentRevision WHERE pageId = ${guide.id}
    `;
    revisionCount = Number(revisions[0]?.total ?? 0);
  }

  const stored = parseGuideBody(guide?.bodyJson ?? "{}");
  const slugPart = guide?.slug.replace(/^\/rehber\//, "") ?? "";

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Rehber</span>
          <h1>{guide ? guide.title : "Yeni rehber"}</h1>
          <p>Rehber metnini, kısa açıklamasını ve SEO alanlarını tek kayıtta yönetin.</p>
        </div>
        <div className="content-profile">
          <strong>{guide?.status === "published" ? "Yayında" : guide?.status === "archived" ? "Arşiv" : "Taslak"}</strong>
          <small>{guide ? `${revisionCount} sürüm` : "Yeni içerik"}</small>
        </div>
      </div>

      <div className="content-panel">
        <form action={saveCmsGuideAction} className="content-form">
          {guide ? <input type="hidden" name="id" value={guide.id} /> : null}

          <label>
            <span>URL kısa adı</span>
            <input
              name="slug"
              required
              maxLength={120}
              defaultValue={slugPart}
              readOnly={Boolean(guide)}
              placeholder="ilk-kitap-nasil-yazilir"
            />
          </label>

          <label>
            <span>Başlık</span>
            <input name="title" required maxLength={220} defaultValue={guide?.title ?? ""} />
          </label>

          <label>
            <span>Kısa özet</span>
            <textarea name="summary" rows={4} maxLength={500} defaultValue={stored.summary ?? ""} />
          </label>

          <label>
            <span>Rehber metni</span>
            <textarea
              name="body"
              required
              rows={24}
              defaultValue={stored.body ?? ""}
              placeholder={"Giriş paragrafı.\n\n## Bölüm başlığı\n\nAçıklama metni.\n\n- Birinci madde\n- İkinci madde"}
            />
          </label>

          <label>
            <span>SEO başlığı</span>
            <input name="seoTitle" maxLength={220} defaultValue={guide?.seoTitle ?? ""} />
          </label>

          <label>
            <span>SEO açıklaması</span>
            <textarea name="seoDescription" rows={3} maxLength={500} defaultValue={guide?.seoDescription ?? ""} />
          </label>

          <label style={{ display: "flex", gridTemplateColumns: "auto 1fr", alignItems: "center" }}>
            <input name="noIndex" type="checkbox" defaultChecked={Boolean(guide?.noIndex)} style={{ width: "auto" }} />
            <span>Arama motorlarında indeksleme</span>
          </label>

          <p className="content-form-help">Slug ilk kayıttan sonra sabitlenir. Her kaydetme ContentRevision içinde yeni sürüm oluşturur.</p>

          <div className="content-form-actions" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <Link href="/icerik/rehber">← Rehber listesi</Link>
            <div style={{ display: "flex", gap: ".7rem", flexWrap: "wrap" }}>
              <button type="submit" name="mode" value="draft">Taslak Kaydet</button>
              {access.canPublish ? <button type="submit" name="mode" value="publish">Kaydet ve Yayınla</button> : null}
            </div>
          </div>
        </form>

        {guide ? (
          <div className="content-publish-box">
            <div>
              <strong>Arşivleme</strong>
              <p>Arşivlenen rehber public siteden kaldırılır; sürüm geçmişi korunur.</p>
            </div>
            <form action={archiveCmsGuideAction}>
              <input type="hidden" name="id" value={guide.id} />
              <button type="submit">Arşivle</button>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}
