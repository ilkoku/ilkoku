import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveCmsPageAction, saveCmsPageAction } from "@/features/cms/page-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { getCmsDraftState, pageDraftKey } from "@/lib/cms-drafts";
import { evaluateCmsPagePublishQuality } from "@/lib/cms-page-quality";
import { parseCmsPageBody } from "@/lib/cms-pages";
import { prisma } from "@/lib/prisma";
import { isCorePublicCmsPage } from "@/lib/public-cms-page-catalog";

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

type CmsPageEditorProps = {
  id?: string;
  publishQualityBlocked?: boolean;
};

export async function CmsPageEditor({ id, publishQualityBlocked = false }: CmsPageEditorProps) {
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
  const stagedState = page?.status === "published"
    ? await getCmsDraftState<PageDraft>(pageDraftKey(page.id))
    : { state: "missing" as const };
  const corruptDraft = stagedState.state === "corrupt";
  const draft = stagedState.state === "valid" ? stagedState.record.payload : undefined;
  const hasPendingDraft = stagedState.state === "valid";
  const slugPart = page?.slug.replace(/^\//, "") ?? "";
  const isHowItWorksPage = page?.contentKey === "page:tr:nasil-calisir";
  const usesStandardPublicTemplate = !page || !isCorePublicCmsPage(page.contentKey);
  const currentTitle = draft?.title ?? page?.title ?? "";
  const currentSummary = draft?.summary ?? stored.summary;
  const currentBody = draft?.body ?? stored.body;
  const currentSeoTitle = draft?.seoTitle ?? page?.seoTitle ?? "";
  const currentSeoDescription = draft?.seoDescription ?? page?.seoDescription ?? "";
  const currentNoIndex = draft?.noIndex ?? Boolean(page?.noIndex);
  const publishQuality = page && !corruptDraft
    ? evaluateCmsPagePublishQuality({
        slug: page.slug,
        title: currentTitle,
        summary: currentSummary,
        body: currentBody,
        seoTitle: currentSeoTitle,
        seoDescription: currentSeoDescription,
        noIndex: currentNoIndex,
      })
    : null;
  const statusLabel = corruptDraft
    ? "Yayında · taslak bütünlüğü bozuk"
    : page?.status === "published" && hasPendingDraft
      ? "Yayında · taslak hazır"
      : page?.status === "published" ? "Yayında" : page?.status === "archived" ? "Arşiv" : "Taslak";
  const statusTone = corruptDraft
    ? "danger"
    : page?.status === "published" && hasPendingDraft
      ? "warning"
      : page?.status === "published"
        ? "success"
        : page?.status === "archived"
          ? "muted"
          : "info";
  const canArchive = Boolean(page && !corruptDraft && (page.status !== "published" || access.canPublish));

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Kurumsal Sayfa · TR</span>
          <h1>{page ? currentTitle : "Yeni kurumsal sayfa"}</h1>
          <p>Kurumsal ve bilgilendirme sayfalarını kod değişikliği olmadan yönetin. Yayındaki sürüm, yeni taslak açıkça yayınlanana kadar korunur.</p>
        </div>
        <aside className="cms-editor-status-card" data-tone={statusTone} aria-label="İçerik durumu">
          <span className="cms-editor-status-card__label">İçerik durumu</span>
          <strong>{statusLabel}</strong>
          <div className="cms-editor-status-card__meta">
            <span className="cms-editor-chip">{page ? `${revisionCount} sürüm` : "Yeni içerik"}</span>
            <span className={`cms-editor-chip ${access.canPublish ? "is-positive" : "is-warning"}`}>
              {access.canPublish ? "Yayın yetkisi açık" : "Taslak yetkisi"}
            </span>
          </div>
        </aside>
      </div>

      <nav className="cms-editor-toolbar" aria-label="Sayfa editörü hızlı işlemleri">
        <div className="cms-editor-toolbar__cluster">
          <Link href="/icerik/sayfalar">← Sayfa listesi</Link>
          <Link href="/icerik/yayin-kuyrugu">Yayın Kuyruğu</Link>
          <Link href="/icerik/gecmis">Sürüm Geçmişi</Link>
        </div>
        <div className="cms-editor-toolbar__cluster">
          {page && !corruptDraft ? <Link href={`/icerik/onizleme/sayfa/${page.id}`}>Taslağı Önizle ↗</Link> : null}
          {page?.status === "published" ? <Link href={page.slug} target="_blank">Canlı sayfa ↗</Link> : null}
        </div>
      </nav>

      {corruptDraft ? (
        <div className="content-panel cms-editor-notice is-danger" role="alert">
          <strong>Çalışma taslağının bütünlüğü bozuk.</strong>
          <p>Ham taslak kaydı korunuyor. Veri doğrulanmadan düzenleme, önizleme, yayınlama ve arşivleme işlemleri durduruldu; canlı sayfa değiştirilmedi.</p>
          <div className="content-form-actions"><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/gecmis">Revision Center →</Link></div>
        </div>
      ) : null}

      {publishQualityBlocked && !corruptDraft ? (
        <div className="content-panel cms-editor-notice is-danger" role="alert">
          <strong>Yayın kalite kapısı geçilemedi.</strong>
          <p>Canlı sürüm değiştirilmedi; gönderdiğiniz çalışma taslak olarak korundu. Aşağıdaki eksikleri tamamlayıp yeniden yayınlayın.</p>
        </div>
      ) : null}

      {!access.canPublish && !corruptDraft ? (
        <div className="content-panel cms-editor-notice is-info">
          <strong>Taslak yönetim yetkisi</strong>
          <p>Bu hesap sayfa içeriği hazırlayabilir ve önizleyebilir. Yayına alma veya yayındaki bir sayfayı arşivleme işlemi için yayın yetkisi gerekir.</p>
        </div>
      ) : null}

      {hasPendingDraft ? (
        <div className="content-panel cms-editor-notice is-warning">
          <strong>Bekleyen çalışma taslağı var.</strong>
          <p>Public sayfa son yayınlanmış sürümü göstermeye devam ediyor. Taslağı önizleyip hazır olduğunda yayınlayabilirsiniz.</p>
        </div>
      ) : null}

      {!corruptDraft ? (
        <div className={`content-panel cms-editor-notice ${publishQuality && !publishQuality.ok ? "is-warning" : "is-info"}`}>
          <strong>Yayın kalite kapısı{publishQuality ? (publishQuality.ok ? " · Hazır" : ` · ${publishQuality.issues.length} eksik`) : " aktif"}</strong>
          {publishQuality ? (
            publishQuality.ok ? (
              <p>Başlık, özet, içerik, canonical ve arama görünümü yayın standardını karşılıyor. OG/Twitter sosyal görseli ile ortak İlkOku header/footer kimliği sistem tarafından otomatik uygulanır.</p>
            ) : (
              <>
                <p>Bu çalışma taslak olarak saklanabilir; ancak aşağıdaki maddeler tamamlanmadan yayına alınamaz.</p>
                <ul>
                  {publishQuality.issues.map((item) => <li key={item.code}>{item.message}</li>)}
                </ul>
                <p className="content-form-help">Mevcut ölçüm: {publishQuality.metrics.bodyWords} kelime · {publishQuality.metrics.bodyCharacters} metin karakteri · {publishQuality.metrics.effectiveSeoTitleCharacters} karakter arama başlığı · {publishQuality.metrics.effectiveSeoDescriptionCharacters} karakter arama açıklaması.</p>
              </>
            )
          ) : (
            <p>Yeni sayfayı önce taslak olarak da kaydedebilirsiniz. Yayın sırasında başlık, özet, içerik, canonical ve indexlenebilir sayfalarda arama metadata kalitesi sunucu tarafında doğrulanır.</p>
          )}
        </div>
      ) : null}

      {usesStandardPublicTemplate && !corruptDraft ? (
        <div className="content-panel cms-editor-notice is-info">
          <strong>İlkOku standart public sayfa şablonu aktif</strong>
          <p>Bu sayfa yayınlandığında ortak İlkOku header/footer yapısı, sıcak editoryal sayfa yüzeyi, slug tabanlı canonical, OG/Twitter sosyal görsel fallback’i ve sitemap/noindex sözleşmesi otomatik uygulanır. Burada yalnız içerik ve arama görünümünü yönetin; site kimliğini sayfa içinde yeniden tasarlamayın.</p>
        </div>
      ) : null}

      {isHowItWorksPage && !corruptDraft ? (
        <div className="content-panel cms-editor-notice is-info">
          <strong>Görsel sayfa düzeni aktif</strong>
          <p>Bu kaydın ## bölüm ve ### adım başlıkları, public “Nasıl Çalışır?” sayfasındaki süreç ve rol kartlarını besler. Metin ve SEO bu çalışma masasından yönetilir; marka görseli ile responsive kart düzeni kod sürümünde korunur. Yayınlamadan önce Taslağı Önizle bağlantısıyla gerçek sayfa düzenini kontrol edin.</p>
        </div>
      ) : null}

      {!corruptDraft ? (
        <div className="content-panel">
          <form action={saveCmsPageAction} className="content-form">
            {page ? <input type="hidden" name="id" value={page.id} /> : null}

            <div className="cms-editor-section-label"><span>İçerik</span><small>Public sayfanın metin alanları</small></div>
            <label><span>URL kısa adı</span><input name="slug" required maxLength={120} defaultValue={slugPart} readOnly={Boolean(page)} placeholder="hakkimizda" /></label>
            <p className="content-form-help">Yalnız a-z, 0-9 ve tire. İlk kayıttan sonra URL sabitlenir. Yönetim alanları ile /eserler, /yazarlar, /turler gibi kodla sahip olunan public rotalar otomatik olarak rezerve edilir ve kullanılamaz.</p>
            <label><span>Başlık</span><input name="title" required maxLength={220} defaultValue={currentTitle} /></label>
            <label><span>Kısa özet</span><textarea name="summary" rows={4} maxLength={500} defaultValue={currentSummary} /></label>
            <p className="content-form-help">Yayın standardı için özet en az 40 karakterle sayfanın amacını anlatmalı.</p>
            <label><span>Sayfa metni</span><textarea name="body" required rows={24} defaultValue={currentBody} placeholder={"İlk paragraf.\n\nİkinci paragraf.\n\n## Ara başlık\n\nAçıklama metni."} /></label>
            <p className="content-form-help">Yayın standardı en az 45 anlamlı kelime ve 250 karakter içerik ister; taslak kaydı için bu eşik zorunlu değildir.</p>

            <div className="cms-editor-section-label"><span>Arama görünümü</span><small>SEO ve indeksleme</small></div>
            <p className="content-form-help">Canonical adres URL kısa adından otomatik üretilir. Sosyal paylaşım görseli İlkOku’nun ortak OG/Twitter fallback’inden gelir. Indexlenebilir sayfalarda etkili arama başlığı 8-70, açıklama 70-180 karakter olmalıdır; alanlar boşsa sayfa başlığı ve kısa özet fallback olarak kullanılır.</p>
            <label><span>SEO başlığı</span><input name="seoTitle" maxLength={220} defaultValue={currentSeoTitle} /></label>
            <label><span>SEO açıklaması</span><textarea name="seoDescription" rows={3} maxLength={500} defaultValue={currentSeoDescription} /></label>
            <label style={{ display: "flex", alignItems: "center", gap: ".7rem" }}><input name="noIndex" type="checkbox" defaultChecked={currentNoIndex} style={{ width: "auto" }} /><span>Arama motorlarında gösterme (noindex)</span></label>

            <div className="cms-editor-savebar">
              <Link href="/icerik/sayfalar">← Listeye dön</Link>
              <div className="cms-editor-savebar__actions">
                <button className="cms-button--secondary" type="submit" name="mode" value="draft">Taslak Kaydet</button>
                {access.canPublish ? <button type="submit" name="mode" value="publish">Kaydet ve Yayınla</button> : null}
              </div>
            </div>
          </form>

          {page ? (
            <div className="content-publish-box">
              <div><strong>Arşivleme</strong><p>{page.status === "published" && !access.canPublish ? "Yayındaki bir sayfayı arşivlemek canlı durumu değiştirdiği için yayın yetkisi gerekir." : "Arşivlenen kurumsal sayfa public siteden kaldırılır; sürüm geçmişi korunur."}</p></div>
              {canArchive ? <form action={archiveCmsPageAction}><input type="hidden" name="id" value={page.id} /><button className="cms-button--danger" type="submit">Arşivle</button></form> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
