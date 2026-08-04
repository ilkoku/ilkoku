import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  sendWeeklyDiscoverySummaryEmail,
  type WeeklyDiscoverySummaryItem,
  type WeeklyDiscoverySummaryMetrics,
} from "@/lib/email/weekly-discovery-summary-email";

const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

type UserRole =
  | "reader"
  | "writer"
  | "editor_pending"
  | "editor"
  | "publisher"
  | "admin";

type UserRow = {
  email: string;
  fullName: string;
  id: string;
  role: UserRole;
};

type MetricRow = {
  editorActivity: bigint | number | string | null;
  followedContentActivity: bigint | number | string | null;
  publisherActivity: bigint | number | string | null;
  socialActivity: bigint | number | string | null;
  systemActivity: bigint | number | string | null;
  totalNotifications: bigint | number | string | null;
  unreadNotifications: bigint | number | string | null;
};

type NotificationRow = {
  createdAt: Date | string;
  message: string;
  title: string;
  type: string;
};

type DeliveryRow = {
  id: string;
  status: string;
};

function toNumber(value: bigint | number | string | null) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function localDateKey(date: Date) {
  const localDate = new Date(date.getTime() + ISTANBUL_OFFSET_MS);
  return [
    localDate.getUTCFullYear(),
    String(localDate.getUTCMonth() + 1).padStart(2, "0"),
    String(localDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function parseWeekStart(value?: string | null) {
  if (value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
    if (!match) throw new Error("INVALID_WEEK_START");

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const localProbe = new Date(Date.UTC(year, month - 1, day));

    if (
      localProbe.getUTCFullYear() !== year ||
      localProbe.getUTCMonth() !== month - 1 ||
      localProbe.getUTCDate() !== day ||
      localProbe.getUTCDay() !== 1
    ) {
      throw new Error("INVALID_WEEK_START");
    }

    const start = new Date(
      Date.UTC(year, month - 1, day) - ISTANBUL_OFFSET_MS,
    );

    return {
      end: new Date(start.getTime() + WEEK_MS),
      start,
      weekStart: value,
    };
  }

  const nowInIstanbul = new Date(Date.now() + ISTANBUL_OFFSET_MS);
  const todayStartUtc =
    Date.UTC(
      nowInIstanbul.getUTCFullYear(),
      nowInIstanbul.getUTCMonth(),
      nowInIstanbul.getUTCDate(),
    ) - ISTANBUL_OFFSET_MS;
  const daysSinceMonday = (nowInIstanbul.getUTCDay() + 6) % 7;
  const currentWeekStart = todayStartUtc - daysSinceMonday * DAY_MS;
  const start = new Date(currentWeekStart - WEEK_MS);

  return {
    end: new Date(currentWeekStart),
    start,
    weekStart: localDateKey(start),
  };
}

function periodLabel(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeZone: "Europe/Istanbul",
  });
  const endInclusive = new Date(end.getTime() - DAY_MS);
  return `${formatter.format(start)} – ${formatter.format(endInclusive)}`;
}

function createdAtLabel(value: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function categoryLabel(type: string) {
  if (type === "reader_comment_reply") return "Sosyal hareket";

  if (
    type === "publisher_followed_author_published" ||
    type === "reader_favorite_work_completed"
  ) {
    return "Takip edilen içerik";
  }

  if (
    type === "editor_review" ||
    type === "editor_recommendation" ||
    type === "reader_work_editor_review_started" ||
    type === "reader_work_editor_review_completed"
  ) {
    return "Editör süreci";
  }

  if (type === "publisher_discovery_shared") {
    return "Yayınevi ve ekip";
  }

  return "Sistem";
}

function destinationPath(role: UserRole) {
  if (role === "editor") return "/editor/bildirimler";
  if (role === "publisher") return "/yayinevi/bildirimler";
  return "/bildirimler";
}

async function listEligibleUsers() {
  return prisma.$queryRaw<UserRow[]>`
    SELECT
      u.id,
      u.email,
      u.fullName,
      u.role
    FROM User u
    INNER JOIN NotificationPreference np
      ON np.userId = u.id
      AND np.weeklySummaryEmail = TRUE
    WHERE u.status = 'active'
      AND u.deletedAt IS NULL
      AND u.emailVerified IS NOT NULL
    ORDER BY u.createdAt ASC
    LIMIT 1000
  `;
}

async function loadMetrics(
  userId: string,
  start: Date,
  end: Date,
): Promise<WeeklyDiscoverySummaryMetrics> {
  const rows = await prisma.$queryRaw<MetricRow[]>`
    SELECT
      COUNT(*) AS totalNotifications,
      SUM(CASE WHEN readAt IS NULL THEN 1 ELSE 0 END) AS unreadNotifications,
      SUM(CASE WHEN type = 'reader_comment_reply' THEN 1 ELSE 0 END) AS socialActivity,
      SUM(CASE WHEN type IN (
        'publisher_followed_author_published',
        'reader_favorite_work_completed'
      ) THEN 1 ELSE 0 END) AS followedContentActivity,
      SUM(CASE WHEN type IN (
        'editor_review',
        'editor_recommendation',
        'reader_work_editor_review_started',
        'reader_work_editor_review_completed'
      ) THEN 1 ELSE 0 END) AS editorActivity,
      SUM(CASE WHEN type = 'publisher_discovery_shared' THEN 1 ELSE 0 END) AS publisherActivity,
      SUM(CASE WHEN type = 'system' THEN 1 ELSE 0 END) AS systemActivity
    FROM Notification
    WHERE userId = ${userId}
      AND createdAt >= ${start}
      AND createdAt < ${end}
  `;
  const row = rows[0];

  return {
    editorActivity: toNumber(row?.editorActivity ?? 0),
    followedContentActivity: toNumber(row?.followedContentActivity ?? 0),
    publisherActivity: toNumber(row?.publisherActivity ?? 0),
    socialActivity: toNumber(row?.socialActivity ?? 0),
    systemActivity: toNumber(row?.systemActivity ?? 0),
    totalNotifications: toNumber(row?.totalNotifications ?? 0),
    unreadNotifications: toNumber(row?.unreadNotifications ?? 0),
  };
}

async function loadHighlights(
  userId: string,
  start: Date,
  end: Date,
): Promise<WeeklyDiscoverySummaryItem[]> {
  const rows = await prisma.$queryRaw<NotificationRow[]>`
    SELECT
      type,
      title,
      message,
      createdAt
    FROM Notification
    WHERE userId = ${userId}
      AND createdAt >= ${start}
      AND createdAt < ${end}
    ORDER BY createdAt DESC
    LIMIT 8
  `;

  return rows.map((row) => ({
    categoryLabel: categoryLabel(row.type),
    createdAtLabel: createdAtLabel(row.createdAt),
    message: row.message,
    title: row.title,
  }));
}

async function claimDelivery(
  userId: string,
  weekStart: string,
  start: Date,
  end: Date,
) {
  const candidateId = randomUUID();

  await prisma.$executeRaw`
    INSERT IGNORE INTO WeeklyDiscoverySummaryDelivery (
      id,
      userId,
      weekStart,
      periodStart,
      periodEnd,
      status,
      attemptCount,
      createdAt,
      updatedAt
    ) VALUES (
      ${candidateId},
      ${userId},
      ${weekStart},
      ${start},
      ${end},
      'pending',
      1,
      CURRENT_TIMESTAMP(3),
      CURRENT_TIMESTAMP(3)
    )
  `;

  const rows = await prisma.$queryRaw<DeliveryRow[]>`
    SELECT id, status
    FROM WeeklyDiscoverySummaryDelivery
    WHERE userId = ${userId}
      AND weekStart = ${weekStart}
    LIMIT 1
  `;
  const row = rows[0];

  if (!row) throw new Error("WEEKLY_SUMMARY_DELIVERY_CLAIM_FAILED");
  if (row.id === candidateId) return row.id;

  if (row.status === "failed") {
    const updated = await prisma.$executeRaw`
      UPDATE WeeklyDiscoverySummaryDelivery
      SET status = 'pending',
        attemptCount = attemptCount + 1,
        failureMessage = NULL,
        updatedAt = CURRENT_TIMESTAMP(3)
      WHERE id = ${row.id}
        AND status = 'failed'
    `;

    return updated === 1 ? row.id : null;
  }

  return null;
}

async function updateDelivery(input: {
  deliveryId: string;
  emailDeliveryId?: string;
  failureMessage?: string;
  metrics: WeeklyDiscoverySummaryMetrics;
  status: "failed" | "sent" | "skipped";
}) {
  const metricsJson = JSON.stringify(input.metrics);
  const failureMessage = input.failureMessage?.slice(0, 1000) ?? null;
  const emailDeliveryId = input.emailDeliveryId ?? null;

  await prisma.$executeRaw`
    UPDATE WeeklyDiscoverySummaryDelivery
    SET status = ${input.status},
      emailDeliveryId = ${emailDeliveryId},
      metrics = ${metricsJson},
      failureMessage = ${failureMessage},
      sentAt = ${input.status === "sent" ? new Date() : null},
      updatedAt = CURRENT_TIMESTAMP(3)
    WHERE id = ${input.deliveryId}
  `;
}

async function processUser(
  user: UserRow,
  window: ReturnType<typeof parseWeekStart>,
) {
  const deliveryId = await claimDelivery(
    user.id,
    window.weekStart,
    window.start,
    window.end,
  );

  if (!deliveryId) return "duplicate" as const;

  const metrics = await loadMetrics(user.id, window.start, window.end);

  if (metrics.totalNotifications === 0) {
    await updateDelivery({
      deliveryId,
      metrics,
      status: "skipped",
    });
    return "skipped" as const;
  }

  const items = await loadHighlights(user.id, window.start, window.end);

  try {
    const result = await sendWeeklyDiscoverySummaryEmail({
      destinationPath: destinationPath(user.role),
      email: user.email,
      fullName: user.fullName,
      items,
      metrics,
      periodLabel: periodLabel(window.start, window.end),
    });

    if (result.delivery === "skipped") {
      await updateDelivery({
        deliveryId,
        metrics,
        status: "skipped",
      });
      return "skipped" as const;
    }

    await updateDelivery({
      deliveryId,
      emailDeliveryId: result.deliveryId,
      metrics,
      status: "sent",
    });
    return "sent" as const;
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "UNKNOWN_WEEKLY_DISCOVERY_SUMMARY_ERROR";

    await updateDelivery({
      deliveryId,
      failureMessage: message,
      metrics,
      status: "failed",
    });
    console.error("WEEKLY_DISCOVERY_SUMMARY_SEND_FAILED", {
      error: message,
      userId: user.id,
      weekStart: window.weekStart,
    });
    return "failed" as const;
  }
}

export async function runWeeklyDiscoverySummaries(
  weekStart?: string | null,
) {
  const window = parseWeekStart(weekStart);
  const users = await listEligibleUsers();
  const counts = {
    duplicate: 0,
    failed: 0,
    sent: 0,
    skipped: 0,
  };

  for (const user of users) {
    const result = await processUser(user, window);
    counts[result] += 1;
  }

  return {
    ...counts,
    eligibleUsers: users.length,
    periodEnd: window.end.toISOString(),
    periodStart: window.start.toISOString(),
    weekStart: window.weekStart,
  };
}
