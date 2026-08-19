import Link from "next/link";
import { requireCmsManager } from "@/lib/cms-access";
import { getCmsDashboardIntegritySignals } from "@/lib/cms-dashboard-integrity";
import { getCmsOperationalIntegrity } from "@/lib/cms-health-integrity";
import { cmsModules } from "@/lib/cms-modules";
import {
  cmsReadinessTargets,
  cmsStarterTargets,
  getCmsReadinessSummary,
  getCmsStarterSummary,
  loadCmsReadiness,
} from "@/lib/cms-readiness";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageCountRow = { total: bigint; drafts: bigint; published: bigint };
type SiteCountRow = { announcements: bigint; forms: bigint; schedules: bigint };
type CountRow = { total: bigint };
type RecentPageRow = { id: string; contentKey: string; title: string; slug: string; status: "draft" | "published" | "archived"; updatedAt: Date };
type RecentSiteRow = { id: string; namespace: string; contentKey: string; status: "draft" | "published" | "archived"; updatedAt: Date };
type ActivityItem = { key: string; label: string; detail: string; status: string; updatedAt: Date; href?: string; action?: string };
type TaskLevel = "blocker" | "warn" | "info";
type DashboardTask = { href: string; title: string; text: string; action: string; level: TaskLevel };
type TaskLane = { level: TaskLevel; eyebrow: string; title: string; emptyText: string; tasks: DashboardTask[] };

const namespaceLabels: Record<string, string> = {
  homepage: "Ana Sayfa",
  homepage_en: "Ana Sayfa · EN",
  site: "Site",
  media: "Medya",
  faq: "SSS & Yardım",
  faq_en: "SSS & Yardım · EN",
  announcement: "Duyurular",
  form_submission: "Formlar & Talepler",
  cms_schedule: "Yayın Zamanlama",
  cms_draft: "Çalışma Taslağı",
  settings: "İçerik Ayarları",
  locale: "Dil Altyapısı",
};

function number(value: bigint | number | null | undefined) { return Number(value ?? 0); }
function statusLabel(status: string) { if (status === "published") return "Yayında"; if (status === "archived") return "Arşiv"; return "Taslak"; }
function taskLevelLabel(level: TaskLevel) { if (level === "blocker") return "BLOCKER"; if (level === "warn") return "ÖNCELİK"; return "TAKİP"; }
function taskImpactLabel(level: TaskLevel) { if (level === "blocker") return "Canlı operasyonu etkileyebilir"; if (level === "warn") return "Bugün ele alınmalı"; return "Canlı yayını durdurmaz"; }
function formatDate(value: Date) { return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function pendingAge(hours: number | null) {
  if (hours === null) return null;
  if (hours < 1) return "1 saatten az";
  if (hours < 24) return `${hours} saat`;
  return `${Math.floor(hours / 24)} gün`;
}
function pageActivityTarget(page: RecentPageRow): Pick<ActivityItem, "href" | "action"> | null {
  if (page.contentKey.startsWith("guide:")) {
    const locale = page.contentKey.startsWith("guide:en:") ? "en" : "tr";
    return { href: `/icerik/rehber/${page.id}?dil=${locale}`, action: "Rehbere dön" };
  }
  if (page.contentKey.startsWith("legal:")) {
    const locale = page.contentKey.startsWith("legal:en:") ? "en" : "tr";
    const prefix = locale === "en" ? "legal:en:" : "legal:";
    const legalSlug = page.contentKey.slice(prefix.length);
    return { href: `/icerik/yasal/${encodeURIComponent(legalSlug)}?dil=${locale}`, action: "Belgeye dön" };
  }
  if (page.contentKey.startsWith("page:tr:")) return { href: `/icerik/sayfalar/${page.id}`, action: "Kayda dön" };
  return null;
}
function siteActivityTarget(item: RecentSiteRow): Pick<ActivityItem, "href" | "action"> | null {
  if (item.namespace === "faq") return { href: `/icerik/sss?dil=tr#faq-${encodeURIComponent(item.contentKey)}`, action: "Kayda dön" };
  if (item.namespace === "faq_en") return { href: `/icerik/sss?dil=en#faq-${encodeURIComponent(item.contentKey)}`, action: "Kayda dön" };
  if (item.namespace === "homepage") return { href: "/icerik/ana-sayfa?dil=tr", action: "Ana Sayfayı aç" };
  if (item.namespace === "homepage_en") return { href: "/icerik/ana-sayfa?dil=en", action: "Ana Sayfayı aç" };
  if (item.namespace === "announcement") return { href: "/icerik/duyurular", action: "Duyuruları aç" };
  if (item.namespace === "media") return { href: "/icerik/medya", action: "Medyayı aç" };
  if (item.namespace === "cms_schedule") return { href: "/icerik/zamanlama", action: "Planları aç" };
  if (item.namespace === "cms_draft") return { href: "/icerik/yayin-kuyrugu", action: "Kuyruğu aç" };
  if (item.namespace === "settings") return { href: "/icerik/ayarlar", action: "Ayarları aç" };
  if (item.namespace === "locale") return { href: "/icerik/diller", action: "Dilleri aç" };
  return null;
}

async function loadDashboardData() {
  try {
    const [pageCounts, siteCounts, revisions, readiness, integrity, recentPages, recentSite] = await Promise.all([
      prisma.$queryRaw<PageCountRow[]>`
        SELECT COUNT(*) AS total,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) AS drafts,
          COUNT(CASE WHEN status = 'published' THEN 1 END) AS published
        FROM ContentPage WHERE status <> 'archived'
      `,
      prisma.$queryRaw<SiteCountRow[]>`
        SELECT
          COUNT(CASE WHEN namespace = 'announcement' AND status = 'published' THEN 1 END) AS announcements,
          COUNT(CASE WHEN namespace = 'form_submission' AND status <> 'archived' THEN 1 END) AS forms,
          COUNT(CASE WHEN namespace = 'cms_schedule' AND status = 'published' THEN 1 END) AS schedules
        FROM SiteContent
      `,
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS total FROM ContentRevision
        WHERE createdAt >= DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 7 DAY)
      `,
      loadCmsReadiness(),
      getCmsOperationalIntegrity(),
      prisma.$queryRaw<RecentPageRow[]>`
        SELECT id, contentKey, title, slug, status, updatedAt FROM ContentPage ORDER BY updatedAt DESC LIMIT 6
      `,
      prisma.$queryRaw<RecentSiteRow[]>`
        SELECT id, namespace, contentKey, status, updatedAt FROM SiteContent
        WHERE namespace <> 'form_submission' ORDER BY updatedAt DESC LIMIT 6
      `,
    ]);

    return {
      pages: { total: number(pageCounts[0]?.total), drafts: number(pageCounts[0]?.drafts), published: number(pageCounts[0]?.published) },
      seoIssues: readiness.seoMissing,
      announcements: number(siteCounts[0]?.announcements),
      forms: number(siteCounts[0]?.forms),
      media: readiness.media,
      schedules: number(siteCounts[0]?.schedules),
      revisions: number(revisions[0]?.total),
      publishQueue: readiness.queue,
      readiness,
      integrity,
      recentPages,
      recentSite,
    };
  } catch {
    return null;
  }
}

export default async function ContentDashboardPage() {
  const access = await requireCmsManager("/icerik");
  const data = await loadDashboardData();
  const areas = cmsModules.filter((module) => module.enabled && module.href !== "/icerik" && (access.isAdmin || !module.adminOnly));

  if (!data) {
    return (
      <section className="content-dashboard">
        <div className="content-page-heading content-dashboard-heading">
          <div><span>Operasyon Merkezi</span><h1>İçerik Genel Bakış</h1><p>İlkOku.com içerik operasyonu için canlı veriler okunamadığında panel yanlış sıfır değer üretmez.</p></div>
          <div className="content-health-badge is-blocked"><small>Panel verisi</small><strong>OKUNAMADI</strong><span>Görev ve metrik üretimi güvenli biçimde durduruldu.</span></div>
        </div>
        <div className="content-panel" role="alert"><strong>Operasyon verileri okunamadı.</strong><p>Veritabanı sorgularından en az biri tamamlanamadı. Gerçek içerik durumunu “0” kabul edip yanlış aksiyon üretmemek için dashboard metrikleri gizlendi. İçerik yayınlamadan önce Sistem Sağlığını kontrol edin.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/hazirlik">Yayın Hazırlığı →</Link></div></div>
        <div className="content-dashboard-section-title content-dashboard-modules-title"><div><span>Modüller</span><h2>Yönetim alanları</h2></div><small>{areas.length} aktif modül</small></div>
        <div className="content-grid content-dashboard-module-grid">{areas.map((area) => <article className="content-card" key={area.href}><small>{area.group}</small><h2>{area.label}</h2><p>{area.description}</p><Link href={area.href}>Yönet →</Link></article>)}</div>
      </section>
    );
  }

  const summary = getCmsReadinessSummary(data.readiness);
  const starter = getCmsStarterSummary(data.readiness);
  const integritySignals = getCmsDashboardIntegritySignals(data.integrity);
  const corporateHref = data.readiness.corporateId ? `/icerik/sayfalar/${data.readiness.corporateId}` : "/icerik/sayfalar";
  const guideHref = data.readiness.guideId ? `/icerik/rehber/${data.readiness.guideId}?dil=tr` : "/icerik/rehber?dil=tr";
  const faqHref = data.readiness.faqFocusKey ? `/icerik/sss?dil=tr#faq-${data.readiness.faqFocusKey}` : "/icerik/sss?dil=tr";
  const faqArchivedHref = data.readiness.faqArchivedKey ? `/icerik/sss?dil=tr#faq-${data.readiness.faqArchivedKey}` : "/icerik/sss?dil=tr";
  const faqPendingHref = data.readiness.faqPendingDraftKey ? `/icerik/sss?dil=tr#faq-${data.readiness.faqPendingDraftKey}` : faqHref;
  const corporateAge = pendingAge(data.readiness.corporatePendingAgeHours);
  const faqAge = pendingAge(data.readiness.faqPendingAgeHours);
  const guideAge = pendingAge(data.readiness.guidesPendingAgeHours);
  const oldestPendingAge = pendingAge(starter.pendingOldestAgeHours);

  const activity: ActivityItem[] = [
    ...data.recentPages.map((page) => {
      const target = pageActivityTarget(page);
      return { key: `page-${page.id}`, label: page.title, detail: page.slug, status: statusLabel(page.status), updatedAt: page.updatedAt, ...(target ?? {}) };
    }),
    ...data.recentSite.map((item) => {
      const target = siteActivityTarget(item);
      return { key: `site-${item.id}`, label: namespaceLabels[item.namespace] ?? item.namespace, detail: item.contentKey, status: statusLabel(item.status), updatedAt: item.updatedAt, ...(target ?? {}) };
    }),
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 8);

  const tasks: DashboardTask[] = [
    integritySignals.blockers > 0 ? { href: "/icerik/saglik?durum=blocker#kontroller", title: `${integritySignals.blockers} CMS bütünlük blokajı`, text: "Canlı payload, yönlendirme, medya servis, footer veya global ayar sözleşmelerinden en az biri bozuk. İçerik görevlerinden önce Sistem Sağlığı üzerinden müdahale edin.", action: "Blokajları aç", level: "blocker" as const } : null,
    integritySignals.warnings > 0 ? { href: "/icerik/saglik?durum=warn#kontroller", title: `${integritySignals.warnings} CMS bütünlük uyarısı`, text: "Taslak, medya, revision veya duyuru bütünlüğünde inceleme gerektiren kayıtlar var. Ham veriyi değiştirmeden Sistem Sağlığı üzerinden ilgili kaynağa gidin.", action: "Uyarıları aç", level: "warn" as const } : null,
    data.readiness.legal < cmsReadinessTargets.legal ? { href: "/icerik/yasal?dil=tr", title: `Yasal CMS sahipliği ${data.readiness.legal}/${cmsReadinessTargets.legal}`, text: "Zorunlu beş yasal belgenin tamamı CMS üzerinden yayınlanmadan içerik kabulü tamamlanmaz.", action: "Yasalı tamamla", level: "blocker" as const } : null,
    data.readiness.homepage < cmsReadinessTargets.homepage ? { href: "/icerik/ana-sayfa?dil=tr", title: `Ana Sayfa CMS kapsamı ${data.readiness.homepage}/${cmsReadinessTargets.homepage}`, text: "Hero, roller, Eser Pasaportu, Neden İlkOku ve footer bölümlerinin yayın durumunu tamamlayın.", action: "Ana Sayfayı aç", level: "warn" as const } : null,
    data.readiness.corporate < cmsReadinessTargets.corporate
      ? data.readiness.corporateCreated >= cmsStarterTargets.corporate
        ? { href: corporateHref, title: "Hakkımızda taslağı hazır · yayın bekliyor", text: data.readiness.corporateSeoReady >= cmsStarterTargets.corporate ? access.canPublish ? "Taslak ve temel SEO alanları hazır. Doğrudan kaydı açıp önizleme sonrası yayın kararını verin." : "Taslak ve temel SEO alanları hazır. Doğrudan kaydı açıp metni ve önizlemeyi kontrol edin." : "Taslak hazır. Doğrudan kaydı açıp SEO title, description ve canonical alanlarını kontrol edin.", action: access.canPublish ? "İncele ve yayınla" : "Taslağı incele", level: "warn" as const }
        : data.readiness.corporateArchived > 0
          ? { href: corporateHref, title: "Hakkımızda arşivde", text: "Yeni kopya oluşturmak yerine mevcut kaydı doğrudan açıp taslak olarak kaydedin; içerik anahtarı ve sürüm geçmişi korunsun.", action: "Arşiv kaydını aç", level: "warn" as const }
          : { href: "/icerik/hazirlik", title: "Hakkımızda başlangıç kaydı eksik", text: "CMS başlangıç setinden güvenli Hakkımızda taslağı oluşturun.", action: "Başlangıç setini aç", level: "warn" as const }
      : null,
    data.readiness.faq < cmsReadinessTargets.faq
      ? data.readiness.faqCreated >= cmsStarterTargets.faq
        ? { href: faqHref, title: `${data.readiness.faqCreated}/${cmsStarterTargets.faq} temel SSS kayıtlı · ${data.readiness.faq}/${cmsReadinessTargets.faq} yayında`, text: "Panel ilk işlem gerektiren temel SSS kartına gider. Soruyu ve cevabı gözden geçirip uygun aksiyonu uygulayın.", action: access.canPublish ? "İncele ve yayınla" : "Taslağı incele", level: "warn" as const }
        : data.readiness.faqArchived > 0
          ? { href: faqArchivedHref, title: `${data.readiness.faqArchived} temel SSS arşivde`, text: `${data.readiness.faqCreated}/${cmsStarterTargets.faq} aktif kayıt var. İlgili arşiv kartına gidip taslağa geri alın; yeni kopya oluşturmayın.`, action: "Arşiv SSS'yi aç", level: "warn" as const }
          : { href: "/icerik/hazirlik", title: `Temel SSS seti ${data.readiness.faqCreated}/${cmsStarterTargets.faq} kayıtlı`, text: "Eksik temel yardım kayıtlarını başlangıç seti üzerinden tamamlayın.", action: "Eksikleri tamamla", level: "warn" as const }
      : null,
    data.readiness.guides < cmsReadinessTargets.guides
      ? data.readiness.guidesCreated >= cmsStarterTargets.guides
        ? { href: guideHref, title: "İlkOku Nasıl Çalışır taslağı hazır · yayın bekliyor", text: data.readiness.guidesSeoReady >= cmsStarterTargets.guides ? access.canPublish ? "Rehber taslağı ve temel SEO alanları hazır. Doğrudan kaydı açıp önizleme sonrası yayınlayın." : "Rehber taslağı ve temel SEO alanları hazır. Doğrudan kaydı açıp önizlemeyi kontrol edin." : "Rehber taslağı hazır. Doğrudan kaydı açıp SEO alanlarını tamamlayın.", action: access.canPublish ? "İncele ve yayınla" : "Taslağı incele", level: "warn" as const }
        : data.readiness.guidesArchived > 0
          ? { href: guideHref, title: "İlkOku Nasıl Çalışır rehberi arşivde", text: "Yeni rehber kopyası oluşturmak yerine mevcut kaydı doğrudan açıp taslağa geri alın.", action: "Arşiv rehberi aç", level: "warn" as const }
          : { href: "/icerik/hazirlik", title: "İlkOku Nasıl Çalışır kaydı eksik", text: "CMS başlangıç setinden rehber taslağını oluşturun.", action: "Başlangıç setini aç", level: "warn" as const }
      : null,
    data.readiness.corporate >= cmsReadinessTargets.corporate && data.readiness.corporatePendingDraft > 0 ? { href: corporateHref, title: `Hakkımızda yayında · değişiklik taslağı var${corporateAge ? ` · ${corporateAge}` : ""}`, text: "Mevcut Hakkımızda canlı ve kabul edilmiş durumda. Bekleyen değişiklik yayınlanana kadar canlı metin değişmez.", action: access.canPublish ? "Değişikliği incele/yayınla" : "Değişikliği incele", level: "info" as const } : null,
    data.readiness.faq >= cmsReadinessTargets.faq && data.readiness.faqPendingDrafts > 0 ? { href: faqPendingHref, title: `${data.readiness.faqPendingDrafts} temel SSS için değişiklik taslağı var${faqAge ? ` · en eskisi ${faqAge}` : ""}`, text: "Dört temel SSS canlı kalmaya devam ediyor. Panel en eski bekleyen temel SSS değişikliğine doğrudan gider.", action: access.canPublish ? "Değişikliği incele/yayınla" : "Değişikliği incele", level: "info" as const } : null,
    data.readiness.guides >= cmsReadinessTargets.guides && data.readiness.guidesPendingDraft > 0 ? { href: guideHref, title: `İlkOku Nasıl Çalışır yayında · değişiklik taslağı var${guideAge ? ` · ${guideAge}` : ""}`, text: "Canlı rehber kabul edilmiş durumda. Bekleyen editoryal değişiklik ayrıca yayınlanana kadar public rehber değişmez.", action: access.canPublish ? "Değişikliği incele/yayınla" : "Değişikliği incele", level: "info" as const } : null,
    data.publishQueue > 0 ? { href: "/icerik/yayin-kuyrugu", title: `${data.publishQueue} içerik operasyon kuyruğunda`, text: starter.pendingTotal > 0 ? `${starter.pendingTotal} kayıt temel CMS içeriğindeki değişikliklerden oluşuyor${oldestPendingAge ? `; en eskisi ${oldestPendingAge}dır bekliyor` : ""}. Kuyruk diğer taslakları da kapsar.` : "Bu taslaklar mevcut canlı kabul sonucunu bozmaz. Önizleyin, planlayın veya yayın yetkisiyle canlıya alın.", action: "Kuyruğu aç", level: "info" as const } : null,
    data.seoIssues > 0 ? { href: "/icerik/seo", title: `${data.seoIssues} yayındaki TR sayfada SEO alanı eksik`, text: "Title, description veya canonical eksiklerini tamamlayın.", action: "SEO'yu düzelt", level: "warn" as const } : null,
    data.forms > 0 ? { href: "/icerik/formlar", title: `${data.forms} açık form talebi var`, text: "Gelen kurumsal talepleri inceleyip sonuçlanan kayıtları arşivleyin.", action: "Talepleri aç", level: "info" as const } : null,
  ].filter(Boolean) as DashboardTask[];

  const priority = { blocker: 0, warn: 1, info: 2 } satisfies Record<TaskLevel, number>;
  tasks.sort((a, b) => priority[a.level] - priority[b.level]);
  const blockerCount = tasks.filter((task) => task.level === "blocker").length;
  const warningCount = tasks.filter((task) => task.level === "warn").length;
  const healthLabel = blockerCount > 0 ? "Blokaj var" : warningCount > 0 ? "İçerik işi var" : tasks.length > 0 ? "Takip gerekli" : "Hazır";
  const healthClass = blockerCount > 0 ? "is-blocked" : warningCount > 0 ? "is-attention" : tasks.length > 0 ? "is-watch" : "is-good";
  const focusTask = tasks[0] ?? null;
  const lanes: TaskLane[] = [
    { level: "blocker", eyebrow: "Önce", title: "Blokajlar", emptyText: "Canlı operasyonu durduran blokaj yok.", tasks: tasks.filter((task) => task.level === "blocker") },
    { level: "warn", eyebrow: "Bugün", title: "İçerik işleri", emptyText: "Bugün için zorunlu içerik işi görünmüyor.", tasks: tasks.filter((task) => task.level === "warn") },
    { level: "info", eyebrow: "Takip", title: "Bekleyen işler", emptyText: "Canlı yayını bozmayan takip işi yok.", tasks: tasks.filter((task) => task.level === "info") },
  ];

  const metrics = [
    { label: "Bütünlük blokajı", value: integritySignals.blockers, note: "Sistem Sağlığı", href: "/icerik/saglik?durum=blocker#kontroller" },
    { label: "Bütünlük uyarısı", value: integritySignals.warnings, note: "Sistem Sağlığı", href: "/icerik/saglik?durum=warn#kontroller" },
    { label: "Yayın hazırlığı", value: `${summary.corePassed}/${summary.coreTotal}`, note: "canlı kabul alanı", href: "/icerik/hazirlik" },
    { label: "Başlangıç seti", value: `${starter.createdTotal}/${starter.total}`, note: starter.archivedTotal > 0 ? `${starter.archivedTotal} arşivde` : `${starter.publishedTotal} canlı`, href: "/icerik/hazirlik" },
    { label: "Bekleyen temel değişiklik", value: starter.pendingTotal, note: oldestPendingAge ? `en eskisi ${oldestPendingAge}` : "canlı yayını bozmuyor", href: "/icerik/hazirlik" },
    { label: "Operasyon kuyruğu", value: data.publishQueue, note: "canlı kabulden bağımsız", href: "/icerik/yayin-kuyrugu" },
    { label: "SEO eksiği", value: data.seoIssues, note: "yayındaki TR sayfa", href: "/icerik/seo" },
    { label: "Form talebi", value: data.forms, note: "açık kayıt", href: "/icerik/formlar" },
    { label: "CMS sayfaları", value: data.pages.total, note: `${data.pages.published} yayında`, href: "/icerik/sayfalar" },
    { label: "Planlı yayın", value: data.schedules, note: "aktif zamanlama", href: "/icerik/zamanlama" },
    { label: "Medya", value: data.media, note: "aktif varlık", href: "/icerik/medya" },
    { label: "Revizyon", value: data.revisions, note: "son 7 gün", href: "/icerik/gecmis" },
  ];

  const quickActions = starter.complete ? [
    { href: "/icerik/hazirlik", label: "Yayın Hazırlığı", text: starter.pendingTotal > 0 ? `${starter.pendingTotal} temel değişiklik bekliyor${oldestPendingAge ? ` · ${oldestPendingAge}` : ""}` : "CMS canlı kabul durumunu aç" },
    { href: corporateHref, label: "Hakkımızda", text: data.readiness.corporatePendingDraft > 0 ? access.canPublish ? `Bekleyen değişikliği incele / yayınla${corporateAge ? ` · ${corporateAge}` : ""}` : `Bekleyen değişikliği incele${corporateAge ? ` · ${corporateAge}` : ""}` : access.canPublish ? "Kaydı incele / yayınla" : "Kurumsal taslağı incele" },
    { href: data.readiness.faqPendingDrafts > 0 ? faqPendingHref : faqHref, label: "Temel SSS", text: data.readiness.faqPendingDrafts > 0 ? access.canPublish ? `Bekleyen değişikliği incele / yayınla (${data.readiness.faqPendingDrafts})${faqAge ? ` · ${faqAge}` : ""}` : `Bekleyen değişikliği incele (${data.readiness.faqPendingDrafts})${faqAge ? ` · ${faqAge}` : ""}` : access.canPublish ? "İlk açık kaydı incele / yayınla" : "İlk açık yardım kaydını incele" },
    { href: guideHref, label: "İlkOku Nasıl Çalışır", text: data.readiness.guidesPendingDraft > 0 ? access.canPublish ? `Bekleyen değişikliği incele / yayınla${guideAge ? ` · ${guideAge}` : ""}` : `Bekleyen değişikliği incele${guideAge ? ` · ${guideAge}` : ""}` : access.canPublish ? "Rehberi incele / yayınla" : "Rehber taslağını incele" },
    { href: "/icerik/yayin-kuyrugu", label: "Yayın Kuyruğu", text: "Bekleyen tüm taslakları yönet" },
  ] : [
    { href: "/icerik/hazirlik", label: "Yayın Hazırlığı", text: "CMS canlı kabul durumunu aç" },
    { href: "/icerik/sayfalar/yeni", label: "+ Yeni Sayfa", text: "Kurumsal taslak oluştur" },
    { href: "/icerik/rehber/yeni?dil=tr", label: "+ Yeni Rehber", text: "Editoryal içerik oluştur" },
    { href: "/icerik/yayin-kuyrugu", label: "Yayın Kuyruğu", text: "Bekleyen taslakları incele" },
  ];

  return (
    <section className="content-dashboard">
      <div className="content-page-heading content-dashboard-heading"><div><span>Operasyon Merkezi</span><h1>İçerik Genel Bakış</h1><p>İlkOku.com için bugün ne yapılması gerektiğini, canlı yayın kabulünü ve son değişiklikleri tek ekrandan yönetin.</p></div><div className={`content-health-badge ${healthClass}`}><small>Canlı içerik durumu</small><strong>{healthLabel}</strong><span>{integritySignals.blockers} bütünlük blokajı · {integritySignals.warnings} bütünlük uyarısı · {summary.corePassed}/{summary.coreTotal} temel alan hazır · {starter.pendingTotal} bekleyen temel değişiklik · {access.canPublish ? "yayın yetkisi aktif" : "taslak yetkisi aktif"}</span></div></div>

      {focusTask ? (
        <Link href={focusTask.href} className={`content-focus-card is-${focusTask.level}`} aria-label={`Şimdi: ${focusTask.title}`}>
          <div className="content-focus-card__copy"><div className="content-focus-card__meta"><span>ŞİMDİ</span><small>{taskLevelLabel(focusTask.level)} · {taskImpactLabel(focusTask.level)}</small></div><strong>{focusTask.title}</strong><p>{focusTask.text}</p></div>
          <span className="content-focus-card__action">{focusTask.action} →</span>
        </Link>
      ) : (
        <div className="content-focus-card is-clear"><div className="content-focus-card__copy"><div className="content-focus-card__meta"><span>ŞİMDİ</span><small>Operasyon temiz</small></div><strong>Acil veya bekleyen içerik işi görünmüyor.</strong><p>Veri bütünlüğü, temel canlı kabul ve editoryal görev sinyalleri temiz. Yeni içerik üretimine veya planlı işlere geçebilirsiniz.</p></div><Link href="/icerik/sayfalar">İçerikleri aç →</Link></div>
      )}

      <div className="content-dashboard-quick-actions" aria-label="Hızlı işlemler">{quickActions.map((action) => <Link href={action.href} key={`${action.href}-${action.label}`}><strong>{action.label}</strong><small>{action.text}</small></Link>)}</div>
      <div className="content-metric-grid">{metrics.map((metric) => <Link href={metric.href} className="content-metric-card content-metric-card--link" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></Link>)}</div>
      <div className="content-dashboard-columns">
        <div className="content-panel content-dashboard-panel"><div className="content-dashboard-section-title"><div><span>Operasyon</span><h2>İş şeritleri</h2></div><Link href="/icerik/hazirlik">Tüm kabul →</Link></div>
          <div className="content-operation-lanes">{lanes.map((lane) => {
            const visibleTasks = focusTask ? lane.tasks.filter((task) => task !== focusTask) : lane.tasks;
            const focusInLane = focusTask?.level === lane.level;
            return <section className={`content-operation-lane is-${lane.level}`} key={lane.level}><div className="content-operation-lane__heading"><div><span>{lane.eyebrow}</span><strong>{lane.title}</strong><small>{taskImpactLabel(lane.level)}</small></div><b>{lane.tasks.length}</b></div>{focusInLane ? <div className="content-operation-lane__focus-note">En önemli görev yukarıdaki “Şimdi” alanında açık.</div> : null}{visibleTasks.length === 0 ? <div className="content-operation-lane__empty">{lane.emptyText}</div> : <div className="content-task-list">{visibleTasks.map((task, index) => <Link href={task.href} className={`content-task-item is-${task.level}`} key={`${task.href}-${task.title}`}><div className="content-task-item__body"><div className="content-task-item__meta"><span>{taskLevelLabel(task.level)}</span><small>#{index + 1}</small></div><strong>{task.title}</strong><p>{task.text}</p></div><span className="content-task-item__action">{task.action} →</span></Link>)}</div>}</section>;
          })}</div>
        </div>
        <div className="content-panel content-dashboard-panel"><div className="content-dashboard-section-title"><div><span>Devam</span><h2>Kaldığın yerden devam et</h2></div><Link href="/icerik/gecmis">Tüm geçmiş →</Link></div>{activity.length === 0 ? <div className="content-empty"><strong>Henüz hareket yok.</strong><p>İçerik değişiklikleri burada görünecek.</p></div> : <div className="content-activity-list">{activity.map((item) => {
          const body = <><div className="content-activity-item__copy"><strong>{item.label}</strong><small>{item.detail}</small></div><div className="content-activity-item__state"><span>{item.status}</span><small>{formatDate(item.updatedAt)}</small></div><span className={`content-activity-item__action${item.href ? "" : " is-muted"}`}>{item.action ? `${item.action} →` : "Yalnız geçmiş kaydı"}</span></>;
          return item.href ? <Link href={item.href} className="content-activity-item content-activity-item--link" key={item.key}>{body}</Link> : <div className="content-activity-item" key={item.key}>{body}</div>;
        })}</div>}</div>
      </div>
      <div className="content-dashboard-section-title content-dashboard-modules-title"><div><span>Modüller</span><h2>Tüm yönetim alanları</h2></div><small>{areas.length} aktif modül</small></div>
      <div className="content-grid content-dashboard-module-grid">{areas.map((area) => <article className="content-card" key={area.href}><small>{area.group}</small><h2>{area.label}</h2><p>{area.description}</p><Link href={area.href}>Yönet →</Link></article>)}</div>
    </section>
  );
}
