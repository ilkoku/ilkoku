import Link from "next/link";
import { requireCmsManager } from "@/lib/cms-access";
import { getCmsLocaleStates } from "@/lib/cms-locale-state";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CountRow = { total: bigint | number };
type ScheduleRow = { valueJson: string; status: "draft" | "published" | "archived" };
type HealthLevel = "pass" | "warn" | "blocker" | "info";
type HealthCheck = {
  group: "Yayın" | "İçerik" | "SEO & Erişim" | "Sistem";
  level: HealthLevel;
  title: string;
  detail: string;
  href?: string;
};

function count(rows: CountRow[]) {
  return Number(rows[0]?.total ?? 0);
}

function parseScheduleState(valueJson: string) {
  try {
    const value = JSON.parse(valueJson) as Record<string, unknown>;
    return typeof value.state === "string" ? value.state : "unknown";
  } catch {
    return "invalid";
  }
}

function levelLabel(level: HealthLevel) {
  if (level === "pass") return "PASS";
  if (level === "warn") return "WARN";
  if (level === "blocker") return "BLOCKER";
  return "INFO";
}

function levelStyle(level: HealthLevel) {
  if (level === "pass") return { borderColor: "#2f9e63" };
  if (level === "warn") return { borderColor: "#c9972b" };
  if (level === "blocker") return { borderColor: "#d15050" };
  return { borderColor: "#65758b" };
}

async function loadHealth() {
  const [
    homepageRows,
    legalRows,
    faqRows,
    guideRows,
    seoRows,
    draftRows,
    pageDraftRows,
    faqDraftRows,
    orphanDraftRows,
    mediaRows,
    redirectRows,
    formRows,
    revisionRows,
    managerRows,
    publisherRows,
    adminRows,
    announcementRows,
    scheduleRows,
    localeStates,
  ] = await Promise.all([
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM SiteContent
      WHERE namespace = 'homepage' AND status = 'published'
        AND contentKey IN ('hero', 'roles', 'passport', 'why', 'footer')
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM ContentPage
      WHERE status = 'published'
        AND contentKey IN (
          'legal:kullanim-sartlari',
          'legal:gizlilik-politikasi',
          'legal:kvkk',
          'legal:cerez-politikasi',
          'legal:telif-hakki-politikasi'
        )
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM SiteContent
      WHERE namespace = 'faq' AND status = 'published'
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM ContentPage
      WHERE status = 'published'
        AND contentKey LIKE 'guide:%'
        AND contentKey NOT LIKE 'guide:en:%'
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM ContentPage
      WHERE status = 'published'
        AND contentKey NOT LIKE 'legal:en:%'
        AND contentKey NOT LIKE 'guide:en:%'
        AND (
          COALESCE(TRIM(seoTitle), '') = ''
          OR COALESCE(TRIM(seoDescription), '') = ''
          OR COALESCE(TRIM(canonicalUrl), '') = ''
        )
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM SiteContent
      WHERE namespace = 'cms_draft' AND status = 'draft'
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM ContentPage
      WHERE status = 'draft'
        AND (contentKey LIKE 'legal:%' OR contentKey LIKE 'guide:%')
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM SiteContent
      WHERE namespace IN ('faq', 'faq_en') AND status = 'draft'
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM SiteContent d
      WHERE d.namespace = 'cms_draft'
        AND d.status = 'draft'
        AND d.contentKey LIKE 'page:%'
        AND NOT EXISTS (
          SELECT 1 FROM ContentPage p
          WHERE CONCAT('page:', p.id) = d.contentKey
        )
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM SiteContent
      WHERE namespace = 'media' AND status <> 'archived'
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM SiteContent
      WHERE namespace = 'redirect' AND status = 'published'
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM SiteContent
      WHERE namespace = 'form_submission' AND status <> 'archived'
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM ContentRevision
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM ContentManagerAccess
      WHERE active = true AND revokedAt IS NULL
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM ContentManagerAccess
      WHERE active = true AND revokedAt IS NULL AND canPublish = true
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM User
      WHERE role = 'admin' AND status = 'active' AND deletedAt IS NULL
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM SiteContent
      WHERE namespace = 'announcement' AND status = 'published'
    `,
    prisma.$queryRaw<ScheduleRow[]>`
      SELECT valueJson, status FROM SiteContent
      WHERE namespace = 'cms_schedule'
      ORDER BY updatedAt DESC
      LIMIT 500
    `,
    getCmsLocaleStates(),
  ]);

  const activeSchedules = scheduleRows.filter((row) => row.status === "published" && parseScheduleState(row.valueJson) === "scheduled").length;
  const failedSchedules = scheduleRows.filter((row) => parseScheduleState(row.valueJson) === "failed").length;
  const enEnabled = localeStates.some((locale) => locale.code === "en" && locale.enabled);
  const pendingQueue = count(draftRows) + count(pageDraftRows) + count(faqDraftRows);

  return {
    homepage: count(homepageRows),
    legal: count(legalRows),
    faq: count(faqRows),
    guides: count(guideRows),
    seoMissing: count(seoRows),
    pendingQueue,
    orphanDrafts: count(orphanDraftRows),
    media: count(mediaRows),
    redirects: count(redirectRows),
    forms: count(formRows),
    revisions: count(revisionRows),
    managers: count(managerRows),
    publishers: count(publisherRows),
    admins: count(adminRows),
    announcements: count(announcementRows),
    activeSchedules,
    failedSchedules,
    enEnabled,
  };
}

export default async function CmsHealthPage() {
  await requireCmsManager("/icerik/saglik");

  let data: Awaited<ReturnType<typeof loadHealth>> | null = null;
  let loadError = false;
  try {
    data = await loadHealth();
  } catch {
    loadError = true;
  }

  const checks: HealthCheck[] = loadError || !data
    ? [{ group: "Sistem", level: "blocker", title: "CMS veri sağlığı okunamadı", detail: "Veritabanı sağlık sorguları tamamlanamadı. Yayın işlemlerinden önce bağlantı ve migration durumunu kontrol edin." }]
    : [
        {
          group: "Yayın",
          level: data.legal === 5 ? "pass" : "blocker",
          title: "TR yasal sayfalar",
          detail: `${data.legal}/5 zorunlu yasal belge CMS üzerinden yayında.`,
          href: "/icerik/yasal?dil=tr",
        },
        {
          group: "Yayın",
          level: data.failedSchedules > 0 ? "blocker" : "pass",
          title: "Yayın zamanlayıcı hataları",
          detail: data.failedSchedules > 0 ? `${data.failedSchedules} başarısız zamanlama kaydı var.` : "Başarısız zamanlama kaydı görünmüyor.",
          href: "/icerik/zamanlama",
        },
        {
          group: "Yayın",
          level: data.enEnabled ? "blocker" : "info",
          title: "İngilizce public dil",
          detail: data.enEnabled ? "EN beklenmedik şekilde aktif. Mevcut yayın kararı gereği kapatılmalı." : "EN bilinçli olarak pasif; yalnız TR public kapsamı aktif.",
          href: "/icerik/diller",
        },
        {
          group: "Yayın",
          level: data.pendingQueue > 0 ? "warn" : "pass",
          title: "Yayın kuyruğu",
          detail: data.pendingQueue > 0 ? `${data.pendingQueue} bekleyen çalışma/ilk yayın taslağı var.` : "Bekleyen yayın taslağı yok.",
          href: "/icerik/yayin-kuyrugu",
        },
        {
          group: "Yayın",
          level: "info",
          title: "Aktif yayın planları",
          detail: `${data.activeSchedules} aktif zamanlama kaydı var.`,
          href: "/icerik/zamanlama",
        },
        {
          group: "İçerik",
          level: data.homepage === 5 ? "pass" : "warn",
          title: "Ana Sayfa CMS kapsamı",
          detail: `${data.homepage}/5 temel ana sayfa bölümü CMS üzerinden yayında; eksiklerde kod fallback'i devreye girer.`,
          href: "/icerik/ana-sayfa?dil=tr",
        },
        {
          group: "İçerik",
          level: data.faq > 0 ? "pass" : "warn",
          title: "SSS & Yardım",
          detail: `${data.faq} TR SSS kaydı yayında.`,
          href: "/icerik/sss?dil=tr",
        },
        {
          group: "İçerik",
          level: "info",
          title: "Rehber içerikleri",
          detail: `${data.guides} TR rehber yayında.`,
          href: "/icerik/rehber?dil=tr",
        },
        {
          group: "İçerik",
          level: "info",
          title: "Medya varlıkları",
          detail: `${data.media} aktif medya kaydı var.`,
          href: "/icerik/medya",
        },
        {
          group: "İçerik",
          level: data.orphanDrafts > 0 ? "warn" : "pass",
          title: "Taslak referans bütünlüğü",
          detail: data.orphanDrafts > 0 ? `${data.orphanDrafts} çalışma taslağı artık var olmayan bir sayfayı işaret ediyor.` : "Sayfa tabanlı çalışma taslaklarında yetim kayıt yok.",
          href: "/icerik/yayin-kuyrugu",
        },
        {
          group: "SEO & Erişim",
          level: data.seoMissing > 0 ? "warn" : "pass",
          title: "Yayınlanmış sayfalarda SEO alanları",
          detail: data.seoMissing > 0 ? `${data.seoMissing} TR yayında sayfada title/description/canonical eksiği var.` : "Yayındaki TR CMS sayfalarında temel SEO alanı eksiği görünmüyor.",
          href: "/icerik/seo",
        },
        {
          group: "SEO & Erişim",
          level: "info",
          title: "308 yönlendirmeler",
          detail: `${data.redirects} aktif CMS yönlendirmesi var.`,
          href: "/icerik/yonlendirmeler",
        },
        {
          group: "Sistem",
          level: data.admins > 0 ? "pass" : "blocker",
          title: "Aktif sistem yöneticisi",
          detail: `${data.admins} aktif admin hesabı bulunuyor.`,
          href: "/sistem-yonetimi",
        },
        {
          group: "Sistem",
          level: data.revisions > 0 ? "pass" : "warn",
          title: "Revision geçmişi",
          detail: `${data.revisions} içerik revision kaydı saklanıyor.`,
          href: "/icerik/gecmis",
        },
        {
          group: "Sistem",
          level: "info",
          title: "CMS erişim yetkileri",
          detail: `${data.managers} aktif içerik yöneticisi kaydı; bunların ${data.publishers} adedi yayın yetkili. Admin yetkileri ayrıca geçerlidir.`,
          href: "/icerik/erisim",
        },
        {
          group: "Sistem",
          level: "info",
          title: "Açık form talepleri",
          detail: `${data.forms} arşivlenmemiş form kaydı var.`,
          href: "/icerik/formlar",
        },
        {
          group: "Sistem",
          level: "info",
          title: "Aktif duyurular",
          detail: `${data.announcements} yayın durumunda duyuru kaydı var.`,
          href: "/icerik/duyurular",
        },
      ];

  const passCount = checks.filter((check) => check.level === "pass").length;
  const warnCount = checks.filter((check) => check.level === "warn").length;
  const blockerCount = checks.filter((check) => check.level === "blocker").length;
  const infoCount = checks.filter((check) => check.level === "info").length;
  const finalPass = blockerCount === 0;
  const groups = ["Yayın", "İçerik", "SEO & Erişim", "Sistem"] as const;

  return (
    <section className="content-dashboard">
      <div className="content-page-heading content-dashboard-heading">
        <div>
          <span>40. İşlem · Final Kontrol</span>
          <h1>CMS Sistem Sağlığı</h1>
          <p>İçerik, yayın, SEO, dil, zamanlama ve erişim sözleşmelerini canlı veritabanı durumuna göre çapraz kontrol eder.</p>
        </div>
        <div className={`content-health-badge ${finalPass ? "is-good" : "is-attention"}`}>
          <small>CMS sonucu</small>
          <strong>{finalPass ? "FINAL PASS" : "BLOCKED"}</strong>
          <span>{passCount} PASS · {warnCount} UYARI · {blockerCount} BLOKAJ · {infoCount} BİLGİ</span>
        </div>
      </div>

      <div className="content-metric-grid">
        <article className="content-metric-card"><span>PASS</span><strong>{passCount}</strong><small>sağlıklı kontrol</small></article>
        <article className="content-metric-card"><span>Uyarı</span><strong>{warnCount}</strong><small>inceleme önerilir</small></article>
        <article className="content-metric-card"><span>Blokaj</span><strong>{blockerCount}</strong><small>yayın güvenliği</small></article>
        <article className="content-metric-card"><span>Bilgi</span><strong>{infoCount}</strong><small>operasyonel durum</small></article>
      </div>

      {groups.map((group) => {
        const groupChecks = checks.filter((check) => check.group === group);
        if (groupChecks.length === 0) return null;
        return (
          <div className="content-panel" key={group} style={{ marginTop: "1rem" }}>
            <div className="content-dashboard-section-title">
              <div><span>Kontrol grubu</span><h2>{group}</h2></div>
              <small>{groupChecks.length} kontrol</small>
            </div>
            <div className="content-list">
              {groupChecks.map((check) => (
                <article className="content-list-row" key={`${group}-${check.title}`} style={{ borderLeft: "4px solid", ...levelStyle(check.level) }}>
                  <div>
                    <small>{levelLabel(check.level)}</small>
                    <strong>{check.title}</strong>
                    <p>{check.detail}</p>
                  </div>
                  {check.href ? <Link href={check.href}>İncele →</Link> : null}
                </article>
              ))}
            </div>
          </div>
        );
      })}

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <strong>Kontrol kapsamı</strong>
        <p>Bu ekran her açılışta güncel CMS verisini yeniden okur. Public route erişilebilirliği ayrıca Production Smoke tarafından doğrulanır; sağlık ekranı Lighthouse/Core Web Vitals testi değildir.</p>
      </div>
    </section>
  );
}
