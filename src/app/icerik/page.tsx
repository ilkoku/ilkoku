import Link from "next/link";
import { requireCmsManager } from "@/lib/cms-access";
import { cmsModules } from "@/lib/cms-modules";
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
  media: bigint;
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

const namespaceLabels: Record<string, string> = {
  homepage: "Ana Sayfa",
  site: "Site",
  media: "Medya",
  faq: "SSS & Yardım",
  announcement: "Duyurular",
  form_submission: "Formlar & Talepler",
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

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function loadDashboardData() {
  try {
    const [pageCounts, seoIssues, siteCounts, revisions, recentPages, recentSite] = await Promise.all([
      prisma.$queryRaw<PageCountRow[]>`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) AS drafts,
          COUNT(CASE WHEN status = 'published' THEN 1 END) AS published
        FROM ContentPage
        WHERE status <> 'archived'
      `,
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS total
        FROM ContentPage
        WHERE status <> 'archived'
          AND (
            COALESCE(TRIM(seoTitle), '') = ''
            OR COALESCE(TRIM(seoDescription), '') = ''
            OR COALESCE(TRIM(canonicalUrl), '') = ''
          )
      `,
      prisma.$queryRaw<SiteCountRow[]>`
        SELECT
          COUNT(CASE WHEN namespace = 'announcement' AND status = 'published' THEN 1 END) AS announcements,
          COUNT(CASE WHEN namespace = 'form_submission' AND status <> 'archived' THEN 1 END) AS forms,
          COUNT(CASE WHEN namespace = 'media' AND status <> 'archived' THEN 1 END) AS media
        FROM SiteContent
      `,
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS total
        FROM ContentRevision
        WHERE createdAt >= DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 7 DAY)
      `,
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
      seoIssues: number(seoIssues[0]?.total),
      announcements: number(siteCounts[0]?.announcements),
      forms: number(siteCounts[0]?.forms),
      media: number(siteCounts[0]?.media),
      revisions: number(revisions[0]?.total),
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
      revisions: 0,
      recentPages: [] as RecentPageRow[],
      recentSite: [] as RecentSiteRow[],
    };
  }
}

export default async function ContentDashboardPage() {
  const access = await requireCmsManager("/icerik");
  const data = await loadDashboardData();
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

  const tasks = [
    data.pages.drafts > 0
      ? { href: "/icerik/sayfalar", title: `${data.pages.drafts} taslak sayfa bekliyor`, text: "Yayınlanacak veya arşivlenecek taslakları gözden geçirin." }
      : null,
    data.seoIssues > 0
      ? { href: "/icerik/seo", title: `${data.seoIssues} sayfada SEO alanı eksik`, text: "Title, description veya canonical eksiklerini tamamlayın." }
      : null,
    data.forms > 0
      ? { href: "/icerik/formlar", title: `${data.forms} açık form talebi var`, text: "Gelen kurumsal talepleri inceleyip sonuçlananları arşivleyin." }
      : null,
  ].filter(Boolean) as Array<{ href: string; title: string; text: string }>;

  const healthLabel = tasks.length === 0 ? "İyi" : tasks.length <= 2 ? "Kontrol gerekli" : "Dikkat gerekli";
  const healthClass = tasks.length === 0 ? "is-good" : tasks.length <= 2 ? "is-watch" : "is-attention";

  const metrics = [
    { label: "CMS sayfaları", value: data.pages.total, note: `${data.pages.published} yayında` },
    { label: "Taslak", value: data.pages.drafts, note: "yayın bekleyen" },
    { label: "SEO eksiği", value: data.seoIssues, note: "sayfa kontrolü" },
    { label: "Aktif duyuru", value: data.announcements, note: "yayında" },
    { label: "Form talebi", value: data.forms, note: "açık kayıt" },
    { label: "Medya", value: data.media, note: "aktif varlık" },
    { label: "Revizyon", value: data.revisions, note: "son 7 gün" },
  ];

  return (
    <section className="content-dashboard">
      <div className="content-page-heading content-dashboard-heading">
        <div>
          <span>Kontrol Merkezi</span>
          <h1>İçerik Genel Bakış</h1>
          <p>İlkOku.com içeriklerinin yayın, SEO, duyuru ve talep durumunu tek ekrandan izleyin.</p>
        </div>
        <div className={`content-health-badge ${healthClass}`}>
          <small>İçerik sağlığı</small>
          <strong>{healthLabel}</strong>
          <span>{access.canPublish ? "Yönet + yayın yetkisi" : "İçerik yönetim yetkisi"}</span>
        </div>
      </div>

      <div className="content-metric-grid">
        {metrics.map((metric) => (
          <article className="content-metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.note}</small>
          </article>
        ))}
      </div>

      <div className="content-dashboard-columns">
        <div className="content-panel content-dashboard-panel">
          <div className="content-dashboard-section-title">
            <div><span>Öncelik</span><h2>Yapılması gerekenler</h2></div>
            <small>{tasks.length} açık konu</small>
          </div>
          {tasks.length === 0 ? (
            <div className="content-dashboard-success">
              <strong>Kritik içerik işi görünmüyor.</strong>
              <p>Yayın, SEO ve kurumsal talepler açısından açık bir uyarı yok.</p>
            </div>
          ) : (
            <div className="content-task-list">
              {tasks.map((task) => (
                <Link href={task.href} className="content-task-item" key={task.href}>
                  <div><strong>{task.title}</strong><p>{task.text}</p></div>
                  <span>İncele →</span>
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
        <div><span>Modüller</span><h2>Hızlı erişim</h2></div>
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
