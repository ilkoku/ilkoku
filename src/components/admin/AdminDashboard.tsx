import type { CSSProperties } from "react";
import Link from "next/link";
import type {
  AuditAction,
  UserRole,
  UserStatus,
  WorkStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const auditActionLabels: Record<AuditAction, string> = {
  email_test_sent: "Admin test e-postası gönderdi",
  email_verified: "E-posta doğrulandı",
  login: "Oturum açıldı",
  logout: "Oturum kapatıldı",
  ownership_stamp_created:
    "Eser sahiplik kaydı oluşturuldu",
  password_changed: "Şifre değiştirildi",
  password_reset_requested:
    "Şifre sıfırlama istendi",
  profile_updated: "Profil güncellendi",
  register: "Kullanıcı kaydoldu",
  role_request_reviewed:
    "Rol başvurusu sonuçlandırıldı",
  role_requested: "Rol başvurusu oluşturuldu",
  work_created: "Eser oluşturuldu",
  work_published: "Eser yayımlandı",
  user_status_changed:
    "Kullanıcı durumu değiştirildi",
  work_status_changed:
    "Eser durumu değiştirildi",
  publisher_status_changed:
    "Yayınevi durumu değiştirildi",
  comment_status_changed:
    "Yorum durumu değiştirildi",
  reading_access_flagged: "Şüpheli okuma erişimi işaretlendi",
  admin_role_view_changed: "Admin rol görünümü değiştirildi",
  publisher_permission_requested: "Yayınevi yetkisi talep edildi",
  publisher_permission_reviewed: "Yayınevi yetki talebi sonuçlandırıldı",
  publisher_work_liked: "Yayınevi eseri beğendi",
  publisher_author_liked: "Yayınevi yazarı beğendi",
  publisher_work_favorited: "Yayınevi eseri favoriledi",
  publisher_author_favorited: "Yayınevi yazarı favoriledi",
  publisher_author_followed: "Yayınevi yazarı takip etti",
  publisher_discovery_shared: "Yayınevi keşif kaydını paylaştı",
};

const roleLabels: Record<UserRole, string> = {
  reader: "Okuyucu",
  writer: "Yazar",
  editor_pending: "Editör adayı",
  editor: "Editör",
  publisher: "Yayınevi",
  admin: "Admin",
};

const statusLabels: Record<UserStatus, string> = {
  active: "Aktif",
  suspended: "Askıda",
  disabled: "Kapalı",
};

const workStatusLabels: Record<WorkStatus, string> = {
  draft: "Taslak",
  in_review: "İncelemede",
  published: "Yayında",
  archived: "Arşivde",
};

const quickLinks = [
  {
    href: "/admin/kullanicilar",
    label: "Bütün kullanıcıları görüntüle",
  },
  {
    href: "/admin/eserler",
    label: "Eserleri incele",
  },
  {
    href: "/admin/editorler",
    label: "Editörleri görüntüle",
  },
  {
    href: "/admin/yayinevleri",
    label: "Yayınevlerini görüntüle",
  },
  {
    href: "/admin/okuyucular",
    label: "Okuyucuları görüntüle",
  },
  {
    href: "/admin/yorumlar",
    label: "Yorumları incele",
  },
  {
    href: "/admin/arsiv",
    label: "Arşiv Merkezini aç",
  },
  {
    href: "/admin/audit-log",
    label: "Sistem hareketlerini incele",
  },
] as const;

type TrendRow = {
  day: string;
  total: bigint | number;
};

type TrendItem = {
  comments: number;
  completedReviews: number;
  key: string;
  label: string;
  readers: number;
  users: number;
  works: number;
};

const TURKEY_OFFSET = 3 * 60 * 60 * 1000;

function turkeyDayStart(offset = 0) {
  const shifted = new Date(Date.now() + TURKEY_OFFSET);

  const start = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + offset,
  );

  return new Date(start - TURKEY_OFFSET);
}

function turkeyDateKey(value: Date) {
  const shifted = new Date(
    value.getTime() + TURKEY_OFFSET,
  );

  return shifted.toISOString().slice(0, 10);
}

function formatDay(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function rowsToMap(rows: TrendRow[]) {
  return new Map(
    rows.map((row) => [
      String(row.day),
      Number(row.total),
    ]),
  );
}

function percent(value: number, maximum: number) {
  if (value === 0) return 0;

  return Math.max(
    8,
    Math.round((value / Math.max(maximum, 1)) * 100),
  );
}

export async function AdminDashboard() {
  const todayStart = turkeyDayStart(0);
  const tomorrowStart = turkeyDayStart(1);
  const sevenDayStart = turkeyDayStart(-6);
  const thirtyDayStart = turkeyDayStart(-29);

  const [
    newUsersToday,
    newWorksToday,
    publishedToday,
    archivedToday,
    commentsToday,
    startedReviewsToday,
    completedReviewsToday,
    readersTodayRows,
    readWorksTodayRows,
    publisherSubmissionsToday,
    usersThirtyDays,
    worksThirtyDays,
    publishedThirtyDays,
    commentsThirtyDays,
    completedReviewsThirtyDays,
    publisherSubmissionsThirtyDays,
    roleGroups,
    userStatusGroups,
    workStatusGroups,
    totalPublishers,
    reportedComments,
    latestActivity,
    userTrendRows,
    workTrendRows,
    commentTrendRows,
    completedReviewTrendRows,
    readerTrendRows,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        createdAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
        deletedAt: null,
      },
    }),
    prisma.work.count({
      where: {
        createdAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.work.count({
      where: {
        publishedAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.work.count({
      where: {
        archivedAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.comment.count({
      where: {
        createdAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
        deletedAt: null,
      },
    }),
    prisma.editorReviewAssignment.count({
      where: {
        startedAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.editorReviewAssignment.count({
      where: {
        completedAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.readingProgress.findMany({
      where: {
        lastReadAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.readingProgress.findMany({
      where: {
        lastReadAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
      distinct: ["workId"],
      select: { workId: true },
    }),
    prisma.publisherSubmission.count({
      where: {
        submittedAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: thirtyDayStart },
        deletedAt: null,
      },
    }),
    prisma.work.count({
      where: {
        createdAt: { gte: thirtyDayStart },
      },
    }),
    prisma.work.count({
      where: {
        publishedAt: { gte: thirtyDayStart },
      },
    }),
    prisma.comment.count({
      where: {
        createdAt: { gte: thirtyDayStart },
        deletedAt: null,
      },
    }),
    prisma.editorReviewAssignment.count({
      where: {
        completedAt: { gte: thirtyDayStart },
      },
    }),
    prisma.publisherSubmission.count({
      where: {
        submittedAt: { gte: thirtyDayStart },
      },
    }),
    prisma.user.groupBy({
      by: ["role"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.work.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.publisher.count({
      where: { archivedAt: null },
    }),
    prisma.comment.count({
      where: {
        deletedAt: null,
        status: "reported",
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        actor: {
          select: {
            displayName: true,
            email: true,
            fullName: true,
            publicId: true,
          },
        },
      },
    }),
    prisma.$queryRaw<TrendRow[]>`
      SELECT
        DATE_FORMAT(
          DATE_ADD(createdAt, INTERVAL 3 HOUR),
          '%Y-%m-%d'
        ) AS day,
        COUNT(*) AS total
      FROM User
      WHERE createdAt >= ${sevenDayStart}
        AND deletedAt IS NULL
      GROUP BY day
      ORDER BY day
    `,
    prisma.$queryRaw<TrendRow[]>`
      SELECT
        DATE_FORMAT(
          DATE_ADD(createdAt, INTERVAL 3 HOUR),
          '%Y-%m-%d'
        ) AS day,
        COUNT(*) AS total
      FROM Work
      WHERE createdAt >= ${sevenDayStart}
      GROUP BY day
      ORDER BY day
    `,
    prisma.$queryRaw<TrendRow[]>`
      SELECT
        DATE_FORMAT(
          DATE_ADD(createdAt, INTERVAL 3 HOUR),
          '%Y-%m-%d'
        ) AS day,
        COUNT(*) AS total
      FROM Comment
      WHERE createdAt >= ${sevenDayStart}
        AND deletedAt IS NULL
      GROUP BY day
      ORDER BY day
    `,
    prisma.$queryRaw<TrendRow[]>`
      SELECT
        DATE_FORMAT(
          DATE_ADD(completedAt, INTERVAL 3 HOUR),
          '%Y-%m-%d'
        ) AS day,
        COUNT(*) AS total
      FROM EditorReviewAssignment
      WHERE completedAt >= ${sevenDayStart}
      GROUP BY day
      ORDER BY day
    `,
    prisma.$queryRaw<TrendRow[]>`
      SELECT
        DATE_FORMAT(
          DATE_ADD(lastReadAt, INTERVAL 3 HOUR),
          '%Y-%m-%d'
        ) AS day,
        COUNT(DISTINCT userId) AS total
      FROM ReadingProgress
      WHERE lastReadAt >= ${sevenDayStart}
      GROUP BY day
      ORDER BY day
    `,
  ]);

  const userTrend = rowsToMap(userTrendRows);
  const workTrend = rowsToMap(workTrendRows);
  const commentTrend = rowsToMap(commentTrendRows);
  const reviewTrend = rowsToMap(
    completedReviewTrendRows,
  );
  const readerTrend = rowsToMap(readerTrendRows);

  const trend: TrendItem[] = Array.from(
    { length: 7 },
    (_, index) => {
      const date = turkeyDayStart(index - 6);
      const key = turkeyDateKey(date);

      return {
        key,
        label: formatDay(date),
        users: userTrend.get(key) ?? 0,
        works: workTrend.get(key) ?? 0,
        comments: commentTrend.get(key) ?? 0,
        completedReviews:
          reviewTrend.get(key) ?? 0,
        readers: readerTrend.get(key) ?? 0,
      };
    },
  );

  const trendMaximum = Math.max(
    1,
    ...trend.flatMap((day) => [
      day.users,
      day.works,
      day.comments,
      day.completedReviews,
      day.readers,
    ]),
  );

  const totalUsers = roleGroups.reduce(
    (total, group) => total + group._count._all,
    0,
  );

  const todayMetrics = [
    {
      label: "Yeni üye",
      value: newUsersToday,
      detail: "Bugün kaydolan kullanıcı",
      href: "/admin/kullanicilar",
    },
    {
      label: "Yeni eser",
      value: newWorksToday,
      detail: "Bugün oluşturulan eser",
      href: "/admin/eserler",
    },
    {
      label: "Yayımlanan eser",
      value: publishedToday,
      detail: "Bugün yayına alınan",
      href: "/admin/eserler?durum=published",
    },
    {
      label: "Bugünkü yorum",
      value: commentsToday,
      detail: "Bugün yapılan yorum",
      href: "/admin/yorumlar",
    },
    {
      label: "Aktif okuyucu",
      value: readersTodayRows.length,
      detail: "Bugün okuma hareketi olan",
      href: "/admin/okuyucular",
    },
    {
      label: "Okunan eser",
      value: readWorksTodayRows.length,
      detail: "Bugün okuma hareketi alan",
      href: "/admin/eserler",
    },
    {
      label: "Başlanan inceleme",
      value: startedReviewsToday,
      detail: "Editörün bugün başladığı",
      href: "/admin/editorler",
    },
    {
      label: "Tamamlanan inceleme",
      value: completedReviewsToday,
      detail: "Editörün bugün tamamladığı",
      href: "/admin/editorler",
    },
    {
      label: "Yayınevi başvurusu",
      value: publisherSubmissionsToday,
      detail: "Bugün gönderilen",
      href: "/admin/yayinevleri",
    },
    {
      label: "Arşivlenen eser",
      value: archivedToday,
      detail: "Bugün arşive taşınan",
      href: "/admin/arsiv",
    },
  ] as const;

  const thirtyDayMetrics = [
    ["Yeni üye", usersThirtyDays],
    ["Yeni eser", worksThirtyDays],
    ["Yayımlanan eser", publishedThirtyDays],
    ["Yorum", commentsThirtyDays],
    ["Editör incelemesi", completedReviewsThirtyDays],
    ["Yayınevi başvurusu", publisherSubmissionsThirtyDays],
  ] as const;

  const today = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "full",
    timeZone: "Europe/Istanbul",
  }).format(new Date());

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">{today}</span>
          <h1>İlkOku Genel Durumu</h1>
          <p>
            Üyeleri, eserleri, okumaları, yorumları,
            editör incelemelerini ve yayınevi hareketlerini
            gerçek verilerle tek ekrandan izleyin.
          </p>
        </div>

        <Link
          className="admin-button admin-button--primary"
          href="/admin/audit-log"
        >
          Sistem hareketlerini aç
        </Link>
      </section>

      <section className="admin-dashboard-section">
        <div className="admin-dashboard-section__heading">
          <div>
            <span>Bugün</span>
            <h2>Anlık platform özeti</h2>
          </div>
        </div>

        <div className="admin-today-grid">
          {todayMetrics.map((metric, index) => (
            <Link
              className="admin-today-card"
              data-tone={
                ["gold", "blue", "green", "violet"][
                  index % 4
                ]
              }
              href={metric.href}
              key={metric.label}
            >
              <span>{metric.label}</span>
              <strong>
                {metric.value.toLocaleString("tr-TR")}
              </strong>
              <small>{metric.detail}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="admin-panel admin-trend-panel">
        <div className="admin-panel__heading">
          <div>
            <span>Son 7 gün</span>
            <h2>Platform hareket grafiği</h2>
          </div>
        </div>

        <div className="admin-chart-legend">
          <span data-series="users">Yeni üye</span>
          <span data-series="works">Yeni eser</span>
          <span data-series="comments">Yorum</span>
          <span data-series="reviews">
            Tamamlanan inceleme
          </span>
          <span data-series="readers">
            Aktif okuyucu
          </span>
        </div>

        <div
          className="admin-activity-chart"
          aria-label="Son yedi günlük faaliyet grafiği"
        >
          {trend.map((day) => (
            <article key={day.key}>
              <div className="admin-chart-bars">
                {[
                  ["users", day.users],
                  ["works", day.works],
                  ["comments", day.comments],
                  ["reviews", day.completedReviews],
                  ["readers", day.readers],
                ].map(([series, value]) => (
                  <span
                    data-series={series}
                    key={series}
                    style={
                      {
                        "--bar-height": `${percent(
                          Number(value),
                          trendMaximum,
                        )}%`,
                      } as CSSProperties
                    }
                    title={`${value}`}
                  >
                    <b>{value}</b>
                  </span>
                ))}
              </div>
              <small>{day.label}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-dashboard-section">
        <div className="admin-dashboard-section__heading">
          <div>
            <span>Son 30 gün</span>
            <h2>Dönem özeti</h2>
          </div>
        </div>

        <div className="admin-period-grid">
          {thirtyDayMetrics.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>
                {value.toLocaleString("tr-TR")}
              </strong>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-dashboard-columns">
        <article className="admin-panel">
          <div className="admin-panel__heading">
            <div>
              <span>Üyeler</span>
              <h2>Rol dağılımı</h2>
            </div>
            <b>{totalUsers}</b>
          </div>

          <div className="admin-distribution-list">
            {roleGroups.map((group) => (
              <div key={group.role}>
                <span>{roleLabels[group.role]}</span>
                <div>
                  <i
                    style={
                      {
                        "--distribution-width":
                          `${percent(
                            group._count._all,
                            totalUsers,
                          )}%`,
                      } as CSSProperties
                    }
                  />
                </div>
                <strong>{group._count._all}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel__heading">
            <div>
              <span>Sistem durumu</span>
              <h2>Hesap ve eser aşamaları</h2>
            </div>
          </div>

          <div className="admin-status-overview">
            {userStatusGroups.map((group) => (
              <div key={group.status}>
                <span>
                  {statusLabels[group.status]} hesap
                </span>
                <strong>{group._count._all}</strong>
              </div>
            ))}

            {workStatusGroups.map((group) => (
              <div key={group.status}>
                <span>
                  {workStatusLabels[group.status]} eser
                </span>
                <strong>{group._count._all}</strong>
              </div>
            ))}

            <div>
              <span>Aktif yayınevi</span>
              <strong>{totalPublishers}</strong>
            </div>

            <div>
              <span>Bildirilen yorum</span>
              <strong>{reportedComments}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="admin-dashboard-columns">
        <article className="admin-panel">
          <div className="admin-panel__heading">
            <div>
              <span>Audit Log</span>
              <h2>Son sistem hareketleri</h2>
            </div>
            <Link href="/admin/audit-log">
              Tümünü gör
            </Link>
          </div>

          {latestActivity.length ? (
            <div className="admin-activity-list">
              {latestActivity.map((activity) => (
                <div
                  className="admin-activity"
                  key={activity.id}
                >
                  <span aria-hidden="true" />
                  <div>
                    <strong>
                      {auditActionLabels[activity.action]}
                    </strong>
                    <p>
                      {activity.actor?.displayName ||
                        activity.actor?.fullName ||
                        activity.actor?.email ||
                        "Sistem"}
                      {activity.actor?.publicId
                        ? ` · ${activity.actor.publicId}`
                        : ""}
                      {activity.entityType
                        ? ` · ${activity.entityType}`
                        : ""}
                    </p>
                  </div>
                  <time
                    dateTime={
                      activity.createdAt.toISOString()
                    }
                  >
                    {formatDate(activity.createdAt)}
                  </time>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-profile-empty">
              Henüz sistem hareketi bulunmuyor.
            </p>
          )}
        </article>

        <article className="admin-panel admin-panel--quick">
          <div className="admin-panel__heading">
            <div>
              <span>Yönetim</span>
              <h2>Hızlı bağlantılar</h2>
            </div>
          </div>

          <div>
            {quickLinks.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
                <span>→</span>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
