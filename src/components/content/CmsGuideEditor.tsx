import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveCmsGuideAction, saveCmsGuideAction } from "@/features/cms/guide-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { getCmsDraft, pageDraftKey } from "@/lib/cms-drafts";
import {
  cmsGuideLocaleFromContentKey,
  parseGuideBody,
} from "@/lib/cms-guides";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import type { CmsLocaleCode } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type GuideRow = {
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

type RevisionRow = { total: number | bigint };
type GuideDraft = {
  title?: string;
  summary?: string;
  body?: string;
  seoTitle?: string;
  seoDescription?: string;
  noIndex?: boolean;
};

export async function CmsGuideEditor({ id, locale: requestedLocale }: { id?: string; locale: CmsLocaleCode }) {
  const access = await requireCmsManager(id ? `/icerik/rehber/${id}` : "/icerik/rehber/yeni");
  let guide: GuideRow | null = null;
  let revisionCount = 0;

  if (id) {
    try {
      const rows = await prisma.$queryRaw<GuideRow[]>`
        SELECT id, contentKey, slug, title, status, bodyJson, seoTitle, seoDescription, noIndex, updatedAt
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

  const locale = guide ? cmsGuideLocaleFromContentKey(guide.contentKey) : requestedLocale;
  const localeEnabled = await isCmsLocaleEnabled(locale);
  const stored = parseGuideBody(guide?.bodyJson ?? "{}");
  const staged = guide?.status === "published"
    ? await getCmsDraft<GuideDraft>(pageDraftKey(guide.id)).catch(() => null)
    : null;
  const draft = staged?.payload;
  const hasPendingDraft = Boolean(draft);
  const prefix = locale === "en" ? /^\/en\/rehber\// : /^\/rehber\//;
  const slugPart = guide?.slug.replace(prefix, "") ?? "";
  const isEn = locale === "en";
  const canPublish = access.canPublish && localeEnabled;
  const statusLabel = guide?.status === "published" && hasPendingDraft
    ? "Yayında · taslak hazır"
    : guide?.status === "published" ? "Yayında" : guide?.status === "archived" ? "Arşiv" : "Taslak";

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Rehber · {locale.toUpperCase()}</span>
          <h1>{guide ? (draft?.title ?? guide.title) : isEn ? "New English guide" : "Yeni rehber"}</h1>
          <p>{isEn ? "İngilizce rehber taslağını Türkçe içerikten bağımsız hazırlayın." : "Yayındaki rehber korunur; kaydettiğiniz düzenlemeler ayrı çalışma taslağında bekler."}</p>
        </div>
        <div className="content-profile">
          <strong>{statusLabel}</strong>
          <small>{guide ? `${revisionCount} sürüm` : "Yeni içerik"}</small>
        </div>
      </div>

      <div className="content-form-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
        <Link href="/icerik/rehber?dil=tr">Türkçe</Link>
        <Link href="/icerik/rehber?dil=en">English</Link>
        {guide ? <Link href={`/icerik/onizleme/rehber/${guide.id}?dil=${locale}`}>Taslağı Önizle ↗</Link> : null}
        <Link href={`/icerik/rehber?dil=${locale}`}>← Rehber listesi</Link>
      </div>

      {hasPendingDraft ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>Bekleyen çalışma taslağı var.</strong>
          <p>Public rehber hâlâ son yayınlanmış sürümü gösteriyor. Taslağı önizleyebilir veya yayın yetkisiyle canlıya aktarabilirsiniz.</p>
        </div>
      ) : null}

      {isEn && !localeEnabled ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>EN yayın kilitli.</strong>
          <p>Rehber taslak olarak kaydedilebilir, önizlenebilir ve sürümlenebilir. İngilizce public dili açılmadan yayınlanamaz.</p>
        </div>
      ) : null}

      <div className="content-panel">
        <form action={saveCmsGuideAction} className="content-form">
          {guide ? <input type="hidden" name="id" value={guide.id} /> : null}
          <input type="hidden" name="locale" value={locale} />

          <label>
            <span>URL kısa adı</span>
            <input
              name="slug"
              required
              maxLength={120}
              defaultValue={slugPart}
              readOnly={Boolean(guide)}
              placeholder={isEn ? "how-to-write-your-first-book" : "ilk-kitap-nasil-yazilir"}
            />
          </label>

          <label>
            <span>Başlık</span>
            <input name="title" required maxLength={220} defaultValue={draft?.title ?? guide?.title ?? ""} />
          </label>

          <label>
            <span>Kısa özet</span>
            <textarea name="summary" rows={4} maxLength={500} defaultValue={draft?.summary ?? stored.summary ?? ""} />
          </label>

          <label>
            <span>Rehber metni</span>
            <textarea
              name="body"
              required
              rows={24}
              defaultValue={draft?.body ?? stored.body ?? ""}
              placeholder={"Giriş paragrafı.\n\n## Bölüm başlığı\n\nAçıklama metni.\n\n- Birinci madde\n- İkinci madde"}
            />
          </label>

          <label>
            <span>SEO başlığı</span>
            <input name="seoTitle" maxLength={220} defaultValue={draft?.seoTitle ?? guide?.seoTitle ?? ""} />
          </label>

          <label>
            <span>SEO açıklaması</span>
            <textarea name="seoDescription" rows={3} maxLength={500} defaultValue={draft?.seoDescription ?? guide?.seoDescription ?? ""} />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: ".7rem" }}>
            <input name="noIndex" type="checkbox" defaultChecked={draft?.noIndex ?? Boolean(guide?.noIndex)} style={{ width: "auto" }} />
            <span>Arama motorlarında gösterme (noindex)</span>
          </label>

          <p className="content-form-help">Slug ilk kayıttan sonra sabitlenir. Taslak kaydı canlı içeriği değiştirmez ve ContentRevision içinde yeni sürüm oluşturur.</p>

          <div className="content-form-actions" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <Link href={`/icerik/rehber?dil=${locale}`}>← Rehber listesi</Link>
            <div style={{ display: "flex", gap: ".7rem", flexWrap: "wrap" }}>
              <button type="submit" name="mode" value="draft">Taslak Kaydet</button>
              {canPublish ? <button type="submit" name="mode" value="publish">Kaydet ve Yayınla</button> : null}
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
              <input type="hidden" name="locale" value={locale} />
              <button type="submit">Arşivle</button>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}
