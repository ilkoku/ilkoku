import Link from "next/link";
import { FooterNavigationWorkbench } from "@/components/content/FooterNavigationWorkbench";
import { HeaderNavigationWorkbench } from "@/components/content/HeaderNavigationWorkbench";
import {
  publishFooterNavigationAction,
  publishHeaderNavigationAction,
} from "@/features/cms/navigation-actions";
import { requireCmsAdmin } from "@/lib/cms-access";
import {
  defaultFooterNavigation,
  FOOTER_DRAFT_KEY,
  FOOTER_LIVE_KEY,
  parseFooterNavigation,
} from "@/lib/cms-footer-navigation";
import { analyzeFooterNavigation } from "@/lib/cms-footer-validation";
import {
  defaultHeaderNavigation,
  HEADER_NAV_DRAFT_KEY,
  HEADER_NAV_LIVE_KEY,
  parseHeaderNavigation,
  SITE_MAP_PAGES,
  validateHeaderNavigation,
} from "@/lib/cms-header-navigation";
import { prisma } from "@/lib/prisma";

type NavigationRow = {
  contentKey: string;
  valueJson: string;
  status: "draft" | "published" | "archived";
  updatedAt: Date;
};

type PageProps = {
  searchParams: Promise<{
    taslak?: string;
    yayin?: string;
    hata?: string;
    menuTaslak?: string;
    menuYayin?: string;
    menuHata?: string;
  }>;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value));
}

export default async function Page({ searchParams }: PageProps) {
  await requireCmsAdmin("/icerik/menuler");
  const params = await searchParams;

  let rows: NavigationRow[] | null = null;
  try {
    rows = await prisma.$queryRaw<NavigationRow[]>`
      SELECT contentKey, valueJson, status, updatedAt
      FROM SiteContent
      WHERE namespace = 'site'
        AND contentKey IN (${FOOTER_LIVE_KEY}, ${FOOTER_DRAFT_KEY}, ${HEADER_NAV_LIVE_KEY}, ${HEADER_NAV_DRAFT_KEY})
      LIMIT 4
    `;
  } catch {
    rows = null;
  }

  if (!rows) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Site</span><h1>Site Haritası & Menü Yönetimi</h1><p>Menü ve footer yapılandırması okunmadan çalışma kopyası veya yayın kararı üretilmez.</p></div></div>
        <div className="content-panel" role="alert"><strong>Gezinme yapılandırması okunamadı.</strong><p>Canlı menü, footer ve çalışma kopyaları doğrulanamadığı için kaydetme/yayınlama aksiyonları durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/menuler">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const headerLiveRow = rows.find((row) => row.contentKey === HEADER_NAV_LIVE_KEY) ?? null;
  const headerDraftRow = rows.find((row) => row.contentKey === HEADER_NAV_DRAFT_KEY && row.status === "draft") ?? null;
  const headerDraftPayload = headerDraftRow ? parseHeaderNavigation(headerDraftRow.valueJson) : null;
  const headerLivePayload = headerLiveRow ? parseHeaderNavigation(headerLiveRow.valueJson) : null;
  const invalidHeaderDraft = Boolean(headerDraftRow && !headerDraftPayload);
  const invalidHeaderLive = Boolean(headerLiveRow && !headerLivePayload);

  const footerLiveRow = rows.find((row) => row.contentKey === FOOTER_LIVE_KEY) ?? null;
  const footerDraftRow = rows.find((row) => row.contentKey === FOOTER_DRAFT_KEY && row.status === "draft") ?? null;
  const footerDraftPayload = footerDraftRow ? parseFooterNavigation(footerDraftRow.valueJson) : null;
  const footerLivePayload = footerLiveRow ? parseFooterNavigation(footerLiveRow.valueJson) : null;
  const invalidFooterDraft = Boolean(footerDraftRow && !footerDraftPayload);
  const invalidFooterLive = Boolean(footerLiveRow && !footerLivePayload);

  if (invalidHeaderDraft || (invalidHeaderLive && !headerDraftPayload) || invalidFooterDraft || (invalidFooterLive && !footerDraftPayload)) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Site</span><h1>Site Haritası & Menü Yönetimi</h1><p>Mevcut gezinme verisi bozuksa kod varsayılanlarıyla üzerine yazılmaz.</p></div></div>
        <div className="content-panel" role="alert"><strong>Gezinme JSON bütünlüğü doğrulanamadı.</strong><p>Bilinmeyen canlı veya taslak içeriğin üzerine yazmamak için menü ve footer düzenleme/yayınlama işlemleri fail-closed olarak durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/menuler">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const headerPayload = headerDraftPayload ?? (headerLiveRow?.status === "published" ? headerLivePayload : null) ?? defaultHeaderNavigation;
  const headerHasSafeDraft = Boolean(headerDraftPayload);
  const headerIssues = validateHeaderNavigation(headerPayload);
  const headerCanPublish = headerHasSafeDraft && headerIssues.length === 0;
  const headerLinkCount = headerPayload.menus.reduce((total, menu) => total + menu.groups.reduce((groupTotal, group) => groupTotal + group.links.length, 0), 0);
  const headerSourceLabel = headerDraftPayload ? "Menü çalışma taslağı" : headerLivePayload && headerLiveRow?.status === "published" ? "Yayındaki menü" : "Kod başlangıç menüsü";
  const headerSourceDetail = headerDraftPayload && headerDraftRow ? `Taslak ${formatDate(headerDraftRow.updatedAt)} güncellendi; canlı menü korunuyor.` : headerLivePayload && headerLiveRow ? `Canlı menü ${formatDate(headerLiveRow.updatedAt)} güncellendi.` : "Henüz CMS menü kaydı yok; güvenli kod düzeni gösteriliyor.";

  let footerPayload = defaultFooterNavigation;
  let footerSourceLabel = "İlk kurulum";
  let footerSourceDetail = "Henüz footer kaydı yok; kod varsayılanları gösteriliyor.";
  if (footerDraftPayload) {
    footerPayload = footerDraftPayload;
    footerSourceLabel = "Footer çalışma taslağı";
    footerSourceDetail = `Canlı footer korunuyor · taslak ${formatDate(footerDraftRow!.updatedAt)} güncellendi.`;
  } else if (footerLivePayload && footerLiveRow?.status === "published") {
    footerPayload = footerLivePayload;
    footerSourceLabel = "Yayındaki footer";
    footerSourceDetail = `Çalışma alanı canlı değerlerden hazırlandı · ${formatDate(footerLiveRow.updatedAt)} güncellendi.`;
  } else if (footerLivePayload) {
    footerPayload = footerLivePayload;
    footerSourceLabel = "Pasif footer kaydı";
    footerSourceDetail = "Pasif kayıt düzenleme başlangıcı olarak gösteriliyor; canlı public override aktif değil.";
  }

  const footerHasSafeDraft = Boolean(footerDraftPayload);
  const linkAnalysis = await analyzeFooterNavigation(footerPayload).catch(() => null);
  const footerBlockers = linkAnalysis?.blocking.length ?? 0;
  const verifiedCount = linkAnalysis?.diagnostics.filter((item) => item.status === "ok").length ?? 0;
  const fallbackCount = linkAnalysis?.fallbackCount ?? 0;
  const footerCanPublish = footerHasSafeDraft && Boolean(linkAnalysis) && footerBlockers === 0;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Site · Admin</span><h1>Site Haritası & Menü Yönetimi</h1><p>Tüm gerçek public sayfaları harita üzerinden gör, seçtiklerini header menüsüne yerleştir; URL yerine sayfa kimliğiyle çalış ve değişiklikleri taslak olarak güvenle yayınla.</p></div>
        <div className="content-profile"><strong>{headerSourceLabel}</strong><small>{headerSourceDetail}</small></div>
      </div>

      {params.menuTaslak === "1" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="status"><strong>Menü çalışma taslağı kaydedildi.</strong><p>Canlı header değişmedi. Taslağı kontrol ettikten sonra ayrıca yayınlayabilirsiniz.</p></div> : null}
      {params.menuYayin === "1" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="status"><strong>Header menüsü yayınlandı.</strong><p>Doğrulanmış menü çalışma taslağı canlı public header’a uygulandı.</p></div> : null}
      {params.menuHata === "yapi" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Menü taslağı kaydedilmedi.</strong><p>Menü yapısında bilinmeyen sayfa veya geçersiz alan bulundu. Mevcut canlı menü değişmedi.</p></div> : null}
      {params.menuHata === "taslak" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Menü yayınlanmadı.</strong><p>Geçerli bir güvenli menü taslağı bulunamadı.</p></div> : null}
      {params.menuHata === "kurallar" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Menü yayınlanmadı.</strong><p>Boş ana menü veya aşırı kalabalık sütun bulundu. Taslak korunuyor; düzenleyip tekrar yayınlayın.</p></div> : null}

      <div className="content-metric-grid" style={{ marginBottom: "1rem" }}>
        <article className="content-metric-card"><span>Site Haritası</span><strong>{SITE_MAP_PAGES.length}</strong><small>seçilebilir gerçek sayfa</small></article>
        <article className="content-metric-card"><span>Ana Menü</span><strong>{headerPayload.menus.length}</strong><small>üst başlık</small></article>
        <article className="content-metric-card"><span>Menü Bağlantısı</span><strong>{headerLinkCount}</strong><small>aktif çalışma düzeni</small></article>
        <article className="content-metric-card"><span>Blokaj</span><strong>{headerIssues.length}</strong><small>menü yayın kuralı</small></article>
      </div>

      <HeaderNavigationWorkbench initial={headerPayload} pages={SITE_MAP_PAGES} />

      <div className="content-publish-box" style={{ marginTop: "1rem" }}>
        <div><strong>Header menüsünü yayınla</strong><p>{!headerHasSafeDraft ? "Önce Site Haritası çalışma masasından menü taslağı kaydedin." : headerIssues.length > 0 ? `${headerIssues.length} menü blokajı düzeltilmeden canlı header değiştirilemez.` : "Kaydedilmiş menü taslağı sayfa kimlikleri ve yapı kurallarından geçti. Canlı header yalnız bu işlemle değişir."}</p></div>
        {headerCanPublish ? <form action={publishHeaderNavigationAction}><button type="submit">Menü Taslağını Yayınla</button></form> : <span className="content-form-help">Yayın koşulları tamamlanmadı</span>}
      </div>

      <details className="content-panel" style={{ marginTop: "1.25rem" }}>
        <summary style={{ cursor: "pointer", fontWeight: 800 }}>Footer Yönetimi · {footerSourceLabel}</summary>
        <p style={{ marginTop: ".5rem" }}>{footerSourceDetail}</p>

        {params.taslak === "1" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="status"><strong>Footer çalışma taslağı kaydedildi.</strong><p>Yayındaki footer değişmedi.</p></div> : null}
        {params.yayin === "1" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="status"><strong>Footer yayınlandı.</strong><p>Doğrulanmış çalışma taslağı canlı footer’a uygulandı.</p></div> : null}
        {params.hata === "taslak" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Footer yayınlanmadı.</strong><p>Geçerli bir güvenli çalışma taslağı bulunamadı.</p></div> : null}
        {params.hata === "linkler" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Footer yayınlanmadı.</strong><p>Footer taslağında kırık, güvenli olmayan veya tekrarlı hedef var.</p></div> : null}
        {!linkAnalysis ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Footer hedef denetimi çalıştırılamadı.</strong><p>Yayınlama fail-closed olarak kilitlendi.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}

        <div className="content-metric-grid" style={{ marginBottom: "1rem" }}>
          <article className="content-metric-card"><span>Bağlantı</span><strong>{linkAnalysis?.diagnostics.length ?? 9}</strong><small>footer hedefi</small></article>
          <article className="content-metric-card"><span>Doğrulandı</span><strong>{verifiedCount}</strong><small>public hedef bulundu</small></article>
          <article className="content-metric-card"><span>Fallback</span><strong>{fallbackCount}</strong><small>güvenli kod hedefi</small></article>
          <article className="content-metric-card"><span>Blokaj</span><strong>{footerBlockers}</strong><small>kırık / duplicate</small></article>
        </div>

        <FooterNavigationWorkbench initial={footerPayload} diagnostics={linkAnalysis?.diagnostics ?? []} hasAnalysis={Boolean(linkAnalysis)} />

        <div className="content-publish-box" style={{ marginTop: "1rem" }}>
          <div><strong>Footer canlı yayın</strong><p>{!footerHasSafeDraft ? "Önce footer çalışma masasından güvenli bir taslak oluşturun." : footerBlockers > 0 ? `${footerBlockers} hedef blokajı düzeltilmeden canlı footer değiştirilemez.` : !linkAnalysis ? "Hedef denetimi tamamlanamadığı için yayın kilitli." : "Kaydedilmiş footer taslağı server-side rota denetiminden geçti."}</p></div>
          {footerCanPublish ? <form action={publishFooterNavigationAction}><button type="submit">Doğrulanmış Footer’ı Yayınla</button></form> : <span className="content-form-help">Yayın koşulları tamamlanmadı</span>}
        </div>
      </details>
    </section>
  );
}
