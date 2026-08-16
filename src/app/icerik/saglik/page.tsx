import Link from "next/link";
import { requireCmsManager } from "@/lib/cms-access";
import { getCmsOperationalIntegrity } from "@/lib/cms-health-integrity";
import { getCmsLocaleStates } from "@/lib/cms-locale-state";
import { prisma } from "@/lib/prisma";
import { HealthMetricCards } from "./HealthMetricCards";
import "./health-ui.css";

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
    const state = typeof value.state === "string" ? value.state : "failed";
    return state === "scheduled" || state === "completed" || state === "cancelled" || state === "failed"
      ? state
      : "failed";
  } catch {
    return "failed";
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

function normalizeHealthLevel(value: string | undefined): HealthLevel | undefined {
  if (value === "pass" || value === "warn" || value === "blocker" || value === "info") return value;
  return undefined;
}

function actionLabel(level: HealthLevel) {
  if (level === "blocker" || level === "warn") return "Müdahale et →";
  if (level === "info") return "Yönet →";
  return "Görüntüle →";
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
    integrity,
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
        AND contentKey NOT LIKE 'page:en:%'
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
        AND (
          contentKey LIKE 'legal:%'
          OR contentKey LIKE 'guide:%'
          OR contentKey LIKE 'page:tr:%'
          OR contentKey LIKE 'page:en:%'
        )
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
    getCmsOperationalIntegrity(),
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
    integrity,
  };
}

export default async function CmsHealthPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  await requireCmsManager("/icerik/saglik");
  const params = await searchParams;
  const activeLevel = normalizeHealthLevel(params.durum);

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
          detail: `${data.legal}/5 zorunlu yasal belge CMS üzerinden yayında. Public yasal URL'ler fallback ile erişilebilir olsa bile CMS sahipliği için 5/5 yayınlanmalıdır.`,
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
          level: data.integrity.invalidFooterLive > 0 ? "blocker" : "pass",
          title: "Canlı footer yapılandırması",
          detail: data.integrity.invalidFooterLive > 0 ? "Yayındaki footer JSON sözleşmesi bozuk. Kod fallback'i devreye girebilir; CMS kaydı düzeltilmeden güvenli kabul verilmez." : "Yayındaki footer kaydı varsa yapı sözleşmesi geçerli.",
          href: "/icerik/menuler",
        },
        {
          group: "Yayın",
          level: data.integrity.invalidRedirects > 0 ? "blocker" : "pass",
          title: "Aktif yönlendirme bütünlüğü",
          detail: data.integrity.invalidRedirects > 0 ? `${data.integrity.invalidRedirects} aktif 308 kaydı parse edilemiyor; eksik graph ile yönlendirme güvenliği doğrulanamaz.` : "Aktif 308 yönlendirme kayıtları geçerli.",
          href: "/icerik/yonlendirmeler",
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
          level: data.faq > 0 ? "pass" : "info",
          title: "SSS & Yardım",
          detail: data.faq > 0 ? `${data.faq} TR SSS kaydı yayında.` : "Henüz TR SSS kaydı yayınlanmamış; bu durum canlı yayın blokajı değildir.",
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
          level: data.integrity.invalidMedia > 0 ? "warn" : "pass",
          title: "Medya metadata bütünlüğü",
          detail: data.integrity.invalidMedia > 0 ? `${data.integrity.invalidMedia} aktif medya metadata kaydı geçersiz; referans/arşiv kararları kilitli tutulmalıdır.` : `${data.media} aktif medya kaydının metadata sözleşmesi geçerli.`,
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
          group: "İçerik",
          level: data.integrity.invalidFooterDraft > 0 ? "warn" : "pass",
          title: "Footer çalışma taslağı",
          detail: data.integrity.invalidFooterDraft > 0 ? "Footer çalışma taslağı parse edilemiyor; canlı footer korunuyor ancak taslak yayınlanamaz." : "Footer çalışma taslağı varsa yapı sözleşmesi geçerli.",
          href: "/icerik/menuler",
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
          level: data.integrity.invalidSettings > 0 ? "blocker" : "pass",
          title: "CMS global ayar bütünlüğü",
          detail: data.integrity.invalidSettings > 0 ? "Global cms_settings kaydı strict şema doğrulamasından geçmiyor; default değerlerle üzerine yazma engellenmiştir." : "Global ayar kaydı varsa strict şema sözleşmesi geçerli.",
          href: "/icerik/ayarlar",
        },
        {
          group: "Sistem",
          level: data.integrity.invalidRevisions > 0 ? "warn" : (data.revisions > 0 ? "pass" : "info"),
          title: "Revision geçmişi",
          detail: data.integrity.invalidRevisions > 0 ? `${data.integrity.invalidRevisions} revision snapshot yapısal olarak bozuk; restore kilitli ve ham kayıt korunuyor.` : data.revisions > 0 ? `${data.revisions} içerik revision kaydı geçerli JSON nesnesi olarak saklanıyor.` : "Henüz revision kaydı oluşmamış; ilk CMS düzenlemesinden sonra otomatik oluşur.",
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
          level: data.integrity.invalidForms > 0 ? "warn" : "info",
          title: "Açık form talepleri",
          detail: data.integrity.invalidForms > 0 ? `${data.integrity.invalidForms} form payload kaydı parse edilemiyor; normal arşiv akışına alınmıyor.` : `${data.forms} arşivlenmemiş form kaydı var.`,
          href: "/icerik/formlar",
        },
        {
          group: "Sistem",
          level: data.integrity.invalidAnnouncements > 0 ? "warn" : "info",
          title: "Duyuru veri bütünlüğü",
          detail: data.integrity.invalidAnnouncements > 0 ? `${data.integrity.invalidAnnouncements} duyuru payload kaydı parse edilemiyor; normal yayın/arşiv aksiyonları kilitli.` : `${data.announcements} yayın durumunda duyuru kaydı var.`,
          href: "/icerik/duyurular",
        },
      ];

  const passCount = checks.filter((check) => check.level === "pass").length;
  const warnCount = checks.filter((check) => check.level === "warn").length;
  const blockerCount = checks.filter((check) => check.level === "blocker").length;
  const infoCount = checks.filter((check) => check.level === "info").length;
  const finalPass = blockerCount === 0;
  const visibleChecks = activeLevel ? checks.filter((check) => check.level === activeLevel) : checks;
  const groups = ["Yayın", "İçerik", "SEO & Erişim", "Sistem"] as const;
  const metrics = [
    { level: "pass" as const, label: "PASS", value: passCount, note: "sağlıklı kontrol" },
    { level: "warn" as const, label: "Uyarı", value: warnCount, note: "inceleme önerilir" },
    { level: "blocker" as const, label: "Blokaj", value: blockerCount, note: "yayın güvenliği" },
    { level: "info" as const, label: "Bilgi", value: infoCount, note: "operasyonel durum" },
  ];

  return (
    <section className="content-dashboard">
      <div className="content-page-heading content-dashboard-heading">
        <div>
          <span>42. İşlem · Akıllı Müdahale</span>
          <h1>CMS Sistem Sağlığı</h1>
          <p>İçerik, yayın, SEO, dil, zamanlama, yapılandırma ve veri bütünlüğü sözleşmelerini canlı veritabanı durumuna göre çapraz kontrol eder.</p>
        </div>
        <div className={`content-health-badge ${finalPass ? "is-good" : "is-attention"}`}>
          <small>CMS sonucu</small>
          <strong>{finalPass ? "FINAL PASS" : "BLOCKED"}</strong>
          <span>{passCount} PASS · {warnCount} UYARI · {blockerCount} BLOKAJ · {infoCount} BİLGİ</span>
        </div>
      </div>

      <HealthMetricCards metrics={metrics} activeLevel={activeLevel} />

      <div id="kontroller" className="content-panel" style={{ marginTop: "1rem" }}>
        <div className="content-dashboard-section-title">
          <div>
            <span>Müdahale görünümü</span>
            <h2>{activeLevel ? `${levelLabel(activeLevel)} kontrolleri` : "Tüm kontroller"}</h2>
          </div>
          {activeLevel ? <Link href="/icerik/saglik#kontroller">Tüm kontrolleri göster →</Link> : <small>Kartlardan birine tıklayarak filtrele</small>}
        </div>
        <p>{activeLevel ? `${visibleChecks.length} kayıt gösteriliyor. WARN/BLOCKER kayıtlarında doğrudan müdahale, INFO/PASS kayıtlarında yönetim veya görüntüleme bağlantısı sunulur.` : "PASS, Uyarı, Blokaj veya Bilgi kartına tıklayarak yalnız o durumdaki kayıtları açabilirsiniz."}</p>
      </div>

      {visibleChecks.length === 0 ? (
        <div className="content-panel" style={{ marginTop: "1rem" }}>
          <div className="content-empty">
            <strong>Bu durumda kayıt yok.</strong>
            <p>Başka bir sağlık kartı seçebilir veya tüm kontrolleri gösterebilirsiniz.</p>
          </div>
        </div>
      ) : null}

      {groups.map((group) => {
        const groupChecks = visibleChecks.filter((check) => check.group === group);
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
                  <div className="cms-health-check-copy">
                    <small className="cms-health-check-level">{levelLabel(check.level)}</small>
                    <strong className="cms-health-check-title">{check.title}</strong>
                    <p>{check.detail}</p>
                  </div>
                  {check.href ? <Link className="cms-health-check-action" href={check.href}>{actionLabel(check.level)}</Link> : null}
                </article>
              ))}
            </div>
          </div>
        );
      })}

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <strong>Kontrol kapsamı</strong>
        <p>Bu ekran her açılışta güncel CMS verisini yeniden okur. Public route erişilebilirliği ve korumalı CMS rotaları ayrıca Production Smoke tarafından doğrulanır; sağlık ekranı Lighthouse/Core Web Vitals testi değildir.</p>
      </div>
    </section>
  );
}
