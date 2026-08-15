import Link from "next/link";
import { requireCmsManager } from "@/lib/cms-access";
import { cmsModules } from "@/lib/cms-modules";
import {
  cmsReadinessTargets,
  getCmsReadinessSummary,
  loadCmsReadiness,
  type CmsReadinessSnapshot,
} from "@/lib/cms-readiness";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageCountRow = {
  total: bigint;
  drafts: bigint;
  published: bigint;
};

type SiteCountRow = {
  announcements: bigint;
  forms: bigint;
  schedules: bigint;
};

type CountRow = { total: bigint };

type RecentPageRow = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  updatedAt: Date;
};

type RecentSiteRow = {
  id: string;
  namespace: string;
  contentKey: string;
  status: "draft" | "published" | "archived";
  updatedAt: Date;
};

type ActivityItem = {
  key: string;
  label: string;
  detail: string;
  status: string;
  updatedAt: Date;
};

type TaskLevel = "blocker" | "warn" | "info";

type DashboardTask = {
  href: string;
  title: string;
  text: string;
  action: string;
  level: TaskLevel;
};

const emptyReadiness: CmsReadinessSnapshot = {
  homepage: 0,
  legal: 0,
  corporate: 0,
  faq: 0,
  guides: 0,
  media: 0,
  seoMissing: 0,
  queue: 0,
};

const namespaceLabels: Record<string, string> = {
  homepage: "Ana Sayfa",
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

function number(value: bigint | number | null | undefined) {
  return Number(value ?? 0);
}

function statusLabel(status: string) {
  if (status === "published") return "Yayında";
  if (status === "archived") return "Arşiv";
  return "Taslak";
}

function taskLevelLabel(level: TaskLevel) {
  if (level === "blocker") return "BLOCKER";
  if (level === "warn") return "ÖNCELİK";
  return "TAKİP";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function loadDashboardData() {
  try {
    const [pageCounts, siteCounts, revisions, readiness, recentPages, recentSite] = await Promise.all([
      prisma.$queryRaw<PageCountRow[]>`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) AS drafts,
          COUNT(CASE WHEN status = 'published' THEN 1 END) AS published
        FROM ContentPage
        WHERE status <> 'archived'
      `,
      prisma.$queryRaw<SiteCountRow[]>`
        SELECT
          COUNT(CASE WHEN namespace = 'announcement' AND status = 'published' THEN 1 END) AS announcements,
          COUNT(CASE WHEN namespace = 'form_submission' AND status <> 'archived' THEN 1 END) AS forms,
          COUNT(CASE WHEN namespace = 'cms_schedule' AND status = 'published' THEN 1 END) AS schedules
        FROM SiteContent
      `,
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS total
        FROM ContentRevision
        WHERE createdAt >= DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 7 DAY)
      `,
      loadCmsReadiness(),
      prisma.$queryRaw<RecentPageRow[]>`
        SELECT id, title, slug, status, updatedAt
        FROM ContentPage
        ORDER BY updatedAt DESC
        LIMIT 6
      `,
      prisma.$queryRaw<RecentSiteRow[]>`
        SELECT id, namespace, contentKey, status, updatedAt
        FROM SiteContent
        WHERE namespace <> 'form_submission'
        ORDER BY updatedAt DESC
        LIMIT 6
      `,
    ]);

    return {
      pages: {
        total: number(pageCounts[0]?.total),
        drafts: number(pageCounts[0]?.drafts),
        published: number(pageCounts[0]?.published),
      },
      seoIssues: readiness.seoMissing,
      announcements: number(siteCounts[0]?.announcements),
      forms: number(siteCounts[0]?.forms),
      media: readiness.media,
      schedules: number(siteCounts[0]?.schedules),
      revisions: number(revisions[0]?.total),
      publishQueue: readiness.queue,
      readiness,
      recentPages,
      recentSite,
    };
  } catch {
    return {
      pages: { total: 0, drafts: 0, published: 0 },
      seoIssues: 0,
      announcements: 0,
      forms: 0,
      media: 0,
      schedules: 0,
      revisions: 0,
      publishQueue: 0,
      readiness: emptyReadiness,
      recentPages: [] as RecentPageRow[],
      recentSite: [] as RecentSiteRow[],
    };
  }
}

export default async function ContentDashboardPage() {
  const access = await requireCmsManager("/icerik");
  const data = await loadDashboardData();
  const summary = getCmsReadinessSummary(data.readiness);
  const areas = cmsModules.filter((module) =>
    module.enabled && module.href !== "/icerik" && (access.isAdmin || !module.adminOnly),
  );

  const activity: ActivityItem[] = [
    ...data.recentPages.map((page) => ({
      key: `page-${page.id}`,
      label: page.title,
      detail: page.slug,
      status: statusLabel(page.status),
      updatedAt: page.updatedAt,
    })),
    ...data.recentSite.map((item) => ({
      key: `site-${item.id}`,
      label: namespaceLabels[item.namespace] ?? item.namespace,
      detail: item.contentKey,
      status: statusLabel(item.status),
      updatedAt: item.updatedAt,
    })),
  ]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  const tasks: DashboardTask[] = [
    data.readiness.legal < cmsReadinessTargets.legal
      ? {
          href: "/icerik/yasal?dil=tr",
          title: `Yasal CMS sahipliği ${data.readiness.legal}/${cmsReadinessTargets.legal}`,
          text: "Zorunlu beş yasal belgenin tamamı CMS üzerinden yayınlanmadan içerik kabulü tamamlanmaz.",
          action: "Yasalı tamamla",
          level: "blocker" as const,
        }
      : null,
    data.readiness.homepage < cmsReadinessTargets.homepage
      ? {
          href: "/icerik/ana-sayfa?dil=tr",
          title: `Ana Sayfa CMS kapsamı ${data.readiness.homepage}/${cmsReadinessTargets.homepage}`,
          text: "Hero, roller, Eser Pasaportu, Neden İlkOku ve footer bölümlerinin yayın durumunu tamamlayın.",
          action: "Ana Sayfayı aç",
          level: "warn" as const,
        }
      : null,
    data.readiness.corporate < cmsReadinessTargets.corporate
      ? {
          href: "/icerik/sayfalar",
          title: "Kurumsal sayfa yayını bekleniyor",
          text: "En az bir indexlenebilir TR kurumsal sayfa yayınlanmalı. Başlangıç için Hakkımızda taslağını kullanabilirsiniz.",
          action: "Sayfaları yönet",
          level: "warn" as const,
        }
      : null,
    data.readiness.faq < cmsReadinessTargets.faq
      ? {
          href: "/icerik/sss?dil=tr",
          title: `Temel SSS seti ${data.readiness.faq}/${cmsReadinessTargets.faq}`,
          text: "İlkOku nedir, yazar yayını, editör incelemesi ve yayınevi keşfi için temel yardım setini tamamlayın.",
          action: "SSS'leri yönet",
          level: "warn" as const,
        }
      : null,
    data.readiness.guides < cmsReadinessTargets.guides
      ? {
          href: "/icerik/rehber?dil=tr",
          title: "Rehber detayı yayını bekleniyor",
          text: "Rehber dizini açık ancak indexlenebilir bir TR rehber detayı henüz yayında değil.",
          action: "Rehberleri yönet",
          level: "warn" as const,
        }
      : null,
    data.publishQueue > 0
      ? {
          href: "/icerik/yayin-kuyrugu",
          title: `${data.publishQueue} içerik yayın bekliyor`,
          text: "Taslakları önizleyin, düzenleyin ve yayın yetkisiyle canlıya alın.",
          action: "Kuyruğu aç",
          level: "warn" as const,
        }
      : null,
    data.seoIssues > 0
      ? {
          href: "/icerik/seo",
          title: `${data.seoIssues} yayındaki TR sayfada SEO alanı eksik`,
          text: "Title, description veya canonical eksiklerini tamamlayın.",
          action: "SEO'yu düzelt",
          level: "warn" as const,
        }
      : null,
    data.forms > 0
      ? {
          href: "/icerik/formlar",
          title: `${data.forms} açık form talebi var`,
          text: "Gelen kurumsal talepleri inceleyip sonuçlanan kayıtları arşivleyin.",
          action: "Talepleri aç",
          level: "info" as const,
        }
      : null,
  ].filter(Boolean) as DashboardTask[];

  const priority = { blocker: 0, warn: 1, info: 2 } satisfies Record<TaskLevel, number>;
  tasks.sort((a, b) => priority[a.level] - priority[b.level]);

  const blockerCount = tasks.filter((task) => task.level === "blocker").length;
  const warningCount = tasks.filter((task) => task.level === "warn").length;

  const healthLabel = blockerCount > 0
    ? "Blokaj var"
    : warningCount > 0
      ? "İçerik işi var"
      : tasks.length > 0
        ? "Takip gerekli"
        : "Hazır";
  const healthClass = blockerCount > 0
    ? "is-blocked"
    : warningCount > 0
      ? "is-attention"
      : tasks.length > 0
        ? "is-watch"
        : "is-good";

  const metrics = [
    { label: "Yayın hazırlığı", value: `${summary.corePassed}/${summary.coreTotal}`, note: "temel içerik alanı", href: "/icerik/hazirlik" },
    { label: "Yayın kuyruğu", value: data.publishQueue, note: "bekleyen içerik", href: "/icerik/yayin-kuyrugu" },
    { label: "SEO eksiği", value: data.seoIssues, note: "yayındaki TR sayfa", href: "/icerik/seo" },
    { label: "Form talebi", value: data.forms, note: "açık kayıt", href: "/icerik/formlar" },
    { label: "CMS sayfaları", value: data.pages.total, note: `${data.pages.published} yayında`, href: "/icerik/sayfalar" },
    { label: "Planlı yayın", value: data.schedules, note: "aktif zamanlama", href: "/icerik/zamanlama" },
    { label: "Medya", value: data.media, note: "aktif varlık", href: "/icerik/medya" },
    { label: "Revizyon", value: data.revisions, note: "son 7 gün", href: "/icerik/gecmis" },
  ];

  const quickActions = [
    { href: "/icerik/hazirlik", label: "Yayın Hazırlığı", text: "Sprint 3 kabul durumunu aç" },
    { href: "/icerik/sayfalar/yeni", label: "+ Yeni Sayfa", text: "Kurumsal taslak oluştur" },
    { href: "/icerik/rehber/yeni?dil=tr", label: "+ Yeni Rehber", text: "Editoryal içerik oluştur" },
    { href: "/icerik/yayin-kuyrugu", label: "Yayın Kuyruğu", text: "Bekleyen taslakları incele" },
  ];

  return (
    <section className="content-dashboard">
      <div className="content-page-heading content-dashboard-heading">
        <div>
          <span>Operasyon Merkezi</span>
          <h1>İçerik Genel Bakış</h1>
          <p>İlkOku.com için bugün ne yapılması gerektiğini, yayın hazırlığını ve son değişiklikleri tek ekrandan yönetin.</p>
        </div>
        <div className={`content-health-badge ${healthClass}`}>
          <small>Canlı içerik durumu</small>
          <strong>{healthLabel}</strong>
          <span>{summary.corePassed}/{summary.coreTotal} temel alan hazır · {access.canPublish ? "yayın yetkisi aktif" : "taslak yetkisi aktif"}</span>
        </div>
      </div>

      <div className="content-dashboard-quick-actions" aria-label="Hızlı işlemler">
        {quickActions.map((action) => (
          <Link href={action.href} key={action.href}>
            <strong>{action.label}</strong>
            <small>{action.text}</small>
          </Link>
        ))}
      </div>

      <div className="content-metric-grid">
        {metrics.map((metric) => (
          <Link href={metric.href} className="content-metric-card content-metric-card--link" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.note}</small>
          </Link>
        ))}
      </div>

      <div className="content-dashboard-columns">
        <div className="content-panel content-dashboard-panel">
          <div className="content-dashboard-section-title">
            <div><span>Bugün</span><h2>Yapılması gerekenler</h2></div>
            <Link href="/icerik/hazirlik">Tüm kabul →</Link>
          </div>
          {tasks.length === 0 ? (
            <div className="content-dashboard-success">
              <strong>İçerik operasyonunda açık konu görünmüyor.</strong>
              <p>Temel yayın hazırlığı, kuyruk ve SEO kontrolleri temiz.</p>
            </div>
          ) : (
            <div className="content-task-list">
              {tasks.map((task, index) => (
                <Link href={task.href} className={`content-task-item is-${task.level}`} key={`${task.href}-${task.title}`}>
                  <div className="content-task-item__body">
                    <div className="content-task-item__meta">
                      <span>{taskLevelLabel(task.level)}</span>
                      <small>#{index + 1}</small>
                    </div>
                    <strong>{task.title}</strong>
                    <p>{task.text}</p>
                  </div>
                  <span className="content-task-item__action">{task.action} →</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="content-panel content-dashboard-panel">
          <div className="content-dashboard-section-title">
            <div><span>Aktivite</span><h2>Son değişiklikler</h2></div>
            <Link href="/icerik/gecmis">Tüm geçmiş →</Link>
          </div>
          {activity.length === 0 ? (
            <div className="content-empty"><strong>Henüz hareket yok.</strong><p>İçerik değişiklikleri burada görünecek.</p></div>
          ) : (
            <div className="content-activity-list">
              {activity.map((item) => (
                <div className="content-activity-item" key={item.key}>
                  <div><strong>{item.label}</strong><small>{item.detail}</small></div>
                  <div><span>{item.status}</span><small>{formatDate(item.updatedAt)}</small></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="content-dashboard-section-title content-dashboard-modules-title">
        <div><span>Modüller</span><h2>Tüm yönetim alanları</h2></div>
        <small>{areas.length} aktif modül</small>
      </div>

      <div className="content-grid content-dashboard-module-grid">
        {areas.map((area) => (
          <article className="content-card" key={area.href}>
            <small>{area.group}</small>
            <h2>{area.label}</h2>
            <p>{area.description}</p>
            <Link href={area.href}>Yönet →</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
