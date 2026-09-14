import Link from "next/link";
import { SiteConsentWorkbench } from "@/components/content/SiteConsentWorkbench";
import { requireCmsAdmin } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";
import {
  defaultSiteConsentSettings,
  parseSiteConsentSettingsStrict,
  type SiteConsentSettings,
} from "@/lib/site-consent-settings";

type Row = { valueJson: string };
type LoadState =
  | { state: "ready"; settings: SiteConsentSettings; firstRun: boolean }
  | { state: "read-error" }
  | { state: "invalid" };

export const dynamic = "force-dynamic";

function hasValue(...names: string[]) {
  return names.some((name) => Boolean(process.env[name]?.trim()));
}

async function loadConsentSettings(): Promise<LoadState> {
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson FROM SiteContent
      WHERE namespace = 'site_consent' AND contentKey = 'global'
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return { state: "ready", settings: defaultSiteConsentSettings, firstRun: true };
    const settings = parseSiteConsentSettingsStrict(row.valueJson);
    return settings ? { state: "ready", settings, firstRun: false } : { state: "invalid" };
  } catch {
    return { state: "read-error" };
  }
}

export default async function SiteHealthPage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  await requireCmsAdmin("/icerik/site-sagligi");
  const params = await searchParams;
  const consent = await loadConsentSettings();

  const siteUrlReady = hasValue("NEXT_PUBLIC_SITE_URL", "SITE_URL");
  const analyticsConfigured = hasValue("NEXT_PUBLIC_GTM_ID", "NEXT_PUBLIC_GA_MEASUREMENT_ID", "GA_MEASUREMENT_ID");
  const searchConsolePropertyConfigured = hasValue("GOOGLE_SEARCH_CONSOLE_PROPERTY", "GSC_PROPERTY");
  const searchConsoleAuthConfigured =
    hasValue("GOOGLE_SERVICE_ACCOUNT_EMAIL") && hasValue("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  const searchConsoleReady = searchConsolePropertyConfigured && searchConsoleAuthConfigured;

  const healthItems = [
    {
      label: "SEO denetim merkezi",
      ready: true,
      detail: "CMS yayın sayfalarında title, description, canonical, noindex ve teknik SEO denetimleri aktif.",
      href: "/icerik/seo",
      action: "SEO Merkezini aç",
    },
    {
      label: "Google görünürlüğü",
      ready: searchConsoleReady,
      detail: searchConsoleReady
        ? "Search Console property ve servis hesabı yapılandırması algılandı."
        : "Search Console API bağlantısı henüz uygulama ortamında tam yapılandırılmamış. Panel sahte indeks verisi üretmez.",
      href: "/icerik/seo?mod=teknik",
      action: "Teknik SEO'ya git",
    },
    {
      label: "Analytics / Tag",
      ready: analyticsConfigured,
      detail: analyticsConfigured
        ? "Analytics veya Tag Manager kimliği ortam yapılandırmasında algılandı; consent davranışı ayrıca doğrulanmalı."
        : "GA4/GTM kimliği algılanmadı. Consent ayarı takip kodunu kendi başına yüklemez.",
      href: "/icerik/site-sagligi#consent",
      action: "Consent ayarlarını gör",
    },
    {
      label: "Robots & Sitemap",
      ready: siteUrlReady,
      detail: siteUrlReady
        ? "Site URL yapılandırması mevcut. Robots ve sitemap canlı uçları ayrıca açılabilir."
        : "Production site URL ortam ayarı eksik veya bu süreçte görünmüyor.",
      href: "/sitemap.xml",
      action: "Sitemap'i aç",
    },
  ];

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Yayın & Görünürlük · Admin</span>
          <h1>Site Sağlığı</h1>
          <p>SEO, Google görünürlüğü, çerez/consent, analytics ve teknik arama motoru sinyallerini tek merkezden yönetin. Public içeriği otomatik değiştirmez.</p>
        </div>
      </div>

      {params.durum === "kaydedildi" ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }} role="status">
          <strong>Consent ayarları kaydedildi.</strong>
          <p>Yeni yapılandırma yalnız consent katmanında kullanılacak; SEO içerik alanlarına dokunulmadı.</p>
        </div>
      ) : null}
      {params.durum === "hata" ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert">
          <strong>Consent ayarları kaydedilemedi.</strong>
          <p>Mevcut kayıt korunmuştur. Veri kaynağı doğrulanmadan varsayılanlarla üzerine yazılmadı.</p>
        </div>
      ) : null}

      <div className="content-dashboard-grid" style={{ marginBottom: "1rem" }}>
        {healthItems.map((item) => (
          <article className="content-panel" key={item.label}>
            <span className="content-status-badge" data-status={item.ready ? "published" : "draft"}>{item.ready ? "Hazır" : "Bağlantı gerekli"}</span>
            <h2>{item.label}</h2>
            <p>{item.detail}</p>
            <div className="content-form-actions"><Link href={item.href} target={item.href.startsWith("/sitemap") ? "_blank" : undefined}>{item.action}</Link></div>
          </article>
        ))}
      </div>

      <div className="content-panel" style={{ marginBottom: "1rem" }}>
        <h2>Teknik hızlı kontrol</h2>
        <p>Bu bağlantılar canlı çıktıyı doğrudan açar. SEO merkezi içerik verisini; bu alan ise altyapı sinyallerini ayırır.</p>
        <div className="content-form-actions" style={{ flexWrap: "wrap" }}>
          <Link href="/robots.txt" target="_blank">robots.txt ↗</Link>
          <Link href="/sitemap.xml" target="_blank">sitemap.xml ↗</Link>
          <Link href="/icerik/seo?mod=teknik">Teknik SEO</Link>
          <Link href="/icerik/saglik">CMS Sistem Sağlığı</Link>
        </div>
      </div>

      <div id="consent" className="content-page-heading" style={{ marginTop: "1.5rem" }}>
        <div>
          <span>Gizlilik · Consent</span>
          <h2>Çerez & Consent Ayarları</h2>
          <p>Zorunlu teknik saklama ayrı kalır. Analitik ve pazarlama kategorileri ziyaretçi tercihi olmadan granted durumuna geçirilmez.</p>
        </div>
      </div>

      {consent.state === "ready" ? (
        <>
          {consent.firstRun ? (
            <div className="content-panel" style={{ marginBottom: "1rem" }}>
              <strong>Güvenli ilk kurulum.</strong>
              <p>Consent kaydı henüz yok. Public banner varsayılan olarak kapalıdır; açıkça kaydetmeden canlı site davranışı değişmez.</p>
            </div>
          ) : null}
          <SiteConsentWorkbench initialSettings={consent.settings} firstRun={consent.firstRun} />
        </>
      ) : (
        <div className="content-panel" role="alert">
          <strong>{consent.state === "read-error" ? "Consent ayarları okunamadı." : "Consent ayar kaydı geçersiz."}</strong>
          <p>Mevcut durum güvenilir biçimde doğrulanamadığı için düzenleme kapatıldı. Public API bu durumda güvenli kapalı varsayılanı kullanır.</p>
        </div>
      )}
    </section>
  );
}
