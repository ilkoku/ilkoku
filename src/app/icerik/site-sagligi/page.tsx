import Link from "next/link";
import { SiteConsentWorkbench } from "@/components/content/SiteConsentWorkbench";
import { requireCmsAdmin } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";
import {
  defaultSiteConsentSettings,
  parseSiteConsentSettingsStrict,
  type SiteConsentSettings,
} from "@/lib/site-consent-settings";
import styles from "./SiteHealthPage.module.css";

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
      code: "SEO",
      label: "SEO denetim merkezi",
      ready: true,
      detail: "CMS yayın sayfalarında title, description, canonical, noindex ve teknik SEO denetimleri aktif.",
      href: "/icerik/seo",
      action: "SEO Merkezini aç",
    },
    {
      code: "GSC",
      label: "Google görünürlüğü",
      ready: searchConsoleReady,
      detail: searchConsoleReady
        ? "Search Console property ve servis hesabı yapılandırması algılandı."
        : "Search Console API bağlantısı henüz uygulama ortamında tam yapılandırılmamış. Panel sahte indeks verisi üretmez.",
      href: "/icerik/seo?mod=teknik",
      action: "Teknik SEO'ya git",
    },
    {
      code: "GA",
      label: "Analytics / Tag",
      ready: analyticsConfigured,
      detail: analyticsConfigured
        ? "Analytics veya Tag Manager kimliği ortam yapılandırmasında algılandı; consent davranışı ayrıca doğrulanmalı."
        : "GA4/GTM kimliği algılanmadı. Consent ayarı takip kodunu kendi başına yüklemez.",
      href: "/icerik/site-sagligi#consent",
      action: "Consent ayarlarını gör",
    },
    {
      code: "BOT",
      label: "Robots & Sitemap",
      ready: siteUrlReady,
      detail: siteUrlReady
        ? "Site URL yapılandırması mevcut. Robots ve sitemap canlı uçları ayrıca açılabilir."
        : "Production site URL ortam ayarı eksik veya bu süreçte görünmüyor.",
      href: "/sitemap.xml",
      action: "Sitemap'i aç",
    },
  ];

  const readyCount = healthItems.filter((item) => item.ready).length;

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Yayın & Görünürlük · Admin</span>
          <h1>Site Sağlığı</h1>
          <p>SEO, Google görünürlüğü, çerez/consent, analytics ve teknik arama motoru sinyallerini tek merkezden izleyin. Bu ekran public içeriği otomatik değiştirmez.</p>
        </div>
        <div className={styles.heroMeta} aria-label="Site sağlığı özeti">
          <div className={styles.heroMetaItem}><span>Kontrol</span><strong>{readyCount}/4 hazır</strong></div>
          <div className={styles.heroMetaItem}><span>Public değişiklik</span><strong>Yok</strong></div>
          <div className={styles.heroMetaItem}><span>Mod</span><strong>Güvenli</strong></div>
        </div>
      </header>

      {params.durum === "kaydedildi" ? (
        <div className={styles.notice} role="status">
          <strong>Consent ayarları kaydedildi.</strong>
          <p>Yeni yapılandırma yalnız consent katmanında kullanılacak; SEO içerik alanlarına dokunulmadı.</p>
        </div>
      ) : null}
      {params.durum === "hata" ? (
        <div className={styles.notice} data-tone="danger" role="alert">
          <strong>Consent ayarları kaydedilemedi.</strong>
          <p>Mevcut kayıt korunmuştur. Veri kaynağı doğrulanmadan varsayılanlarla üzerine yazılmadı.</p>
        </div>
      ) : null}

      <section className={styles.healthGrid} aria-label="Site sağlığı kontrolleri">
        {healthItems.map((item) => (
          <article className={styles.healthCard} key={item.label}>
            <div className={styles.healthIcon} aria-hidden="true">{item.code}</div>
            <div className={styles.healthBody}>
              <div className={styles.cardTop}>
                <h2>{item.label}</h2>
                <span className={styles.status} data-ready={item.ready}>{item.ready ? "Hazır" : "Bağlantı gerekli"}</span>
              </div>
              <p>{item.detail}</p>
              <Link className={styles.cardAction} href={item.href} target={item.href.startsWith("/sitemap") ? "_blank" : undefined}>{item.action} →</Link>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.quickPanel}>
        <div>
          <h2>Teknik hızlı kontrol</h2>
          <p>Canlı robots ve sitemap uçlarını ya da CMS teknik SEO ekranını tek tıkla açın.</p>
        </div>
        <div className={styles.quickLinks}>
          <Link href="/robots.txt" target="_blank">robots.txt ↗</Link>
          <Link href="/sitemap.xml" target="_blank">sitemap.xml ↗</Link>
          <Link href="/icerik/seo?mod=teknik">Teknik SEO</Link>
          <Link href="/icerik/saglik">CMS Sistem Sağlığı</Link>
        </div>
      </section>

      <section id="consent" className={styles.consentSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Gizlilik · Consent</span>
          <h2>Çerez & Consent Ayarları</h2>
          <p>Zorunlu teknik saklama ayrı kalır. Analitik ve pazarlama kategorileri ziyaretçi tercihi olmadan granted durumuna geçirilmez.</p>
        </div>

        {consent.state === "ready" ? (
          <>
            {consent.firstRun ? (
              <div className={styles.firstRun}>
                <span className={styles.firstRunMark} aria-hidden="true">01</span>
                <div>
                  <strong>Güvenli ilk kurulum</strong>
                  <p>Consent kaydı henüz yok. Public banner varsayılan olarak kapalıdır; açıkça kaydetmeden canlı site davranışı değişmez.</p>
                </div>
              </div>
            ) : null}
            <SiteConsentWorkbench initialSettings={consent.settings} firstRun={consent.firstRun} />
          </>
        ) : (
          <div className={styles.notice} data-tone="danger" role="alert">
            <strong>{consent.state === "read-error" ? "Consent ayarları okunamadı." : "Consent ayar kaydı geçersiz."}</strong>
            <p>Mevcut durum güvenilir biçimde doğrulanamadığı için düzenleme kapatıldı. Public API bu durumda güvenli kapalı varsayılanı kullanır.</p>
          </div>
        )}
      </section>
    </section>
  );
}
