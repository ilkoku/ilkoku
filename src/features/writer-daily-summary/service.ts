import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  sendWriterDailySummaryEmail,
  type WriterDailySummaryHighlight,
  type WriterDailySummaryMetrics,
} from "@/lib/email/writer-daily-summary-email";

const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

 type WriterRow = {
  email: string;
  fullName: string;
  id: string;
};

type MetricRow = {
  comments: bigint | number | string | null;
  completions: bigint | number | string | null;
  editorFavorites: bigint | number | string | null;
  favorites: bigint | number | string | null;
  publisherFavorites: bigint | number | string | null;
  publisherFollows: bigint | number | string | null;
  publisherLikes: bigint | number | string | null;
  publisherShares: bigint | number | string | null;
  totalReads: bigint | number | string | null;
  uniqueReaders: bigint | number | string | null;
};

type HighlightRow = {
  reads: bigint | number | string | null;
  title: string;
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

function parseSummaryDate(value?: string | null) {
  if (value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
    if (!match) throw new Error("INVALID_SUMMARY_DATE");

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const localProbe = new Date(Date.UTC(year, month - 1, day));

    if (
      localProbe.getUTCFullYear() !== year ||
      localProbe.getUTCMonth() !== month - 1 ||
      localProbe.getUTCDate() !== day
    ) {
      throw new Error("INVALID_SUMMARY_DATE");
    }

    const start = new Date(
      Date.UTC(year, month - 1, day) - ISTANBUL_OFFSET_MS,
    );

    return {
      end: new Date(start.getTime() + DAY_MS),
      start,
      summaryDate: value,
    };
  }

  const nowInIstanbul = new Date(Date.now() + ISTANBUL_OFFSET_MS);
  const todayStartUtc =
    Date.UTC(
      nowInIstanbul.getUTCFullYear(),
      nowInIstanbul.getUTCMonth(),
      nowInIstanbul.getUTCDate(),
    ) - ISTANBUL_OFFSET_MS;
  const start = new Date(todayStartUtc - DAY_MS);
  const localDate = new Date(start.getTime() + ISTANBUL_OFFSET_MS);
  const summaryDate = [
    localDate.getUTCFullYear(),
    String(localDate.getUTCMonth() + 1).padStart(2, "0"),
    String(localDate.getUTCDate()).padStart(2, "0"),
  ].join("-");

  return {
    end: new Date(todayStartUtc),
    start,
    summaryDate,
  };
}

function dateLabel(start: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeZone: "Europe/Istanbul",
  }).format(start);
}

function hasMeaningfulActivity(metrics: WriterDailySummaryMetrics) {
  return Object.values(metrics).some((value) => value > 0);
}

async function listEligibleWriters() {
  return prisma.$queryRaw<WriterRow[]>`
    SELECT
      u.id,
      u.email,
      u.fullName
    FROM User u
    INNER JOIN NotificationPreference np
      ON np.userId = u.id
      AND np.dailySummaryEmail = TRUE
    WHERE u.status = 'active'
      AND u.deletedAt IS NULL
      AND u.emailVerified IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM Work w
        WHERE w.authorId = u.id
      )
    ORDER BY u.createdAt ASC
    LIMIT 500
  `;
}

async function loadMetrics(
  authorId: string,
  start: Date,
  end: Date,
): Promise<WriterDailySummaryMetrics> {
  const rows = await prisma.$queryRaw<MetricRow[]>`
    SELECT
      (
        SELECT COALESCE(SUM(ra.viewCount), 0)
        FROM ReadingAccess ra
        INNER JOIN Work w ON w.id = ra.workId
        WHERE w.authorId = ${authorId}
          AND ra.openedAt >= ${start}
          AND ra.openedAt < ${end}
          AND ra.riskLevel IN ('normal', 'watch')
      ) AS totalReads,
      (
        SELECT COUNT(DISTINCT ra.userId)
        FROM ReadingAccess ra
        INNER JOIN Work w ON w.id = ra.workId
        WHERE w.authorId = ${authorId}
          AND ra.openedAt >= ${start}
          AND ra.openedAt < ${end}
          AND ra.riskLevel IN ('normal', 'watch')
      ) AS uniqueReaders,
      (
        SELECT COUNT(*)
        FROM ReadingProgress rp
        INNER JOIN Work w ON w.id = rp.workId
        WHERE w.authorId = ${authorId}
          AND rp.completedAt >= ${start}
          AND rp.completedAt < ${end}
      ) AS completions,
      (
        SELECT COUNT(*)
        FROM Favorite f
        INNER JOIN Work w ON w.id = f.workId
        WHERE w.authorId = ${authorId}
          AND f.createdAt >= ${start}
          AND f.createdAt < ${end}
      ) AS favorites,
      (
        SELECT COUNT(*)
        FROM Comment c
        INNER JOIN Work w ON w.id = c.workId
        WHERE w.authorId = ${authorId}
          AND c.status = 'visible'
          AND c.createdAt >= ${start}
          AND c.createdAt < ${end}
      ) AS comments,
      (
        SELECT COUNT(*)
        FROM EditorFavorite ef
        INNER JOIN Work w ON w.id = ef.workId
        WHERE w.authorId = ${authorId}
          AND ef.createdAt >= ${start}
          AND ef.createdAt < ${end}
      ) AS editorFavorites,
      (
        SELECT COUNT(*)
        FROM PublisherWorkLike pwl
        INNER JOIN Work w ON w.id = pwl.workId
        WHERE w.authorId = ${authorId}
          AND pwl.createdAt >= ${start}
          AND pwl.createdAt < ${end}
      ) AS publisherLikes,
      (
        SELECT COUNT(*)
        FROM PublisherWorkFavorite pwf
        INNER JOIN Work w ON w.id = pwf.workId
        WHERE w.authorId = ${authorId}
          AND pwf.createdAt >= ${start}
          AND pwf.createdAt < ${end}
      ) AS publisherFavorites,
      (
        SELECT COUNT(*)
        FROM PublisherAuthorFollow paf
        WHERE paf.authorId = ${authorId}
          AND paf.createdAt >= ${start}
          AND paf.createdAt < ${end}
      ) AS publisherFollows,
      (
        SELECT COUNT(*)
        FROM PublisherDiscoveryShare pds
        LEFT JOIN Work sharedWork ON sharedWork.id = pds.workId
        WHERE (pds.authorId = ${authorId} OR sharedWork.authorId = ${authorId})
          AND pds.createdAt >= ${start}
          AND pds.createdAt < ${end}
      ) AS publisherShares
  `;
  const row = rows[0];

  return {
    comments: toNumber(row?.comments ?? 0),
    completions: toNumber(row?.completions ?? 0),
    editorFavorites: toNumber(row?.editorFavorites ?? 0),
    favorites: toNumber(row?.favorites ?? 0),
    publisherFavorites: toNumber(row?.publisherFavorites ?? 0),
    publisherFollows: toNumber(row?.publisherFollows ?? 0),
    publisherLikes: toNumber(row?.publisherLikes ?? 0),
    publisherShares: toNumber(row?.publisherShares ?? 0),
    totalReads: toNumber(row?.totalReads ?? 0),
    uniqueReaders: toNumber(row?.uniqueReaders ?? 0),
  };
}

async function loadTopWork(
  authorId: string,
  start: Date,
  end: Date,
): Promise<WriterDailySummaryHighlight> {
  const rows = await prisma.$queryRaw<HighlightRow[]>`
    SELECT w.title, COALESCE(SUM(ra.viewCount), 0) AS reads
    FROM ReadingAccess ra
    INNER JOIN Work w ON w.id = ra.workId
    WHERE w.authorId = ${authorId}
      AND ra.openedAt >= ${start}
      AND ra.openedAt < ${end}
      AND ra.riskLevel IN ('normal', 'watch')
    GROUP BY w.id, w.title
    ORDER BY reads DESC, w.title ASC
    LIMIT 1
  `;
  const row = rows[0];

  return row
    ? { reads: toNumber(row.reads), title: row.title }
    : null;
}

async function loadTopChapter(
  authorId: string,
  start: Date,
  end: Date,
): Promise<WriterDailySummaryHighlight> {
  const rows = await prisma.$queryRaw<HighlightRow[]>`
    SELECT CONCAT(w.title, ' — ', c.title) AS title,
      COALESCE(SUM(ra.viewCount), 0) AS reads
    FROM ReadingAccess ra
    INNER JOIN Work w ON w.id = ra.workId
    INNER JOIN Chapter c ON c.id = ra.chapterId
    WHERE w.authorId = ${authorId}
      AND ra.openedAt >= ${start}
      AND ra.openedAt < ${end}
      AND ra.riskLevel IN ('normal', 'watch')
    GROUP BY c.id, w.title, c.title
    ORDER BY reads DESC, c.position ASC
    LIMIT 1
  `;
  const row = rows[0];

  return row
    ? { reads: toNumber(row.reads), title: row.title }
    : null;
}

async function claimDelivery(
  authorId: string,
  summaryDate: string,
  start: Date,
  end: Date,
) {
  const candidateId = randomUUID();

  await prisma.$executeRaw`
    INSERT IGNORE INTO WriterDailySummaryDelivery (
      id,
      authorId,
      summaryDate,
      periodStart,
      periodEnd,
      status,
      attemptCount,
      createdAt,
      updatedAt
    ) VALUES (
      ${candidateId},
      ${authorId},
      ${summaryDate},
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
    FROM WriterDailySummaryDelivery
    WHERE authorId = ${authorId}
      AND summaryDate = ${summaryDate}
    LIMIT 1
  `;
  const row = rows[0];

  if (!row) throw new Error("SUMMARY_DELIVERY_CLAIM_FAILED");
  if (row.id === candidateId) return row.id;

  if (row.status === "failed") {
    const updated = await prisma.$executeRaw`
      UPDATE WriterDailySummaryDelivery
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
  metrics: WriterDailySummaryMetrics;
  status: "failed" | "sent" | "skipped";
}) {
  const metricsJson = JSON.stringify(input.metrics);
  const failureMessage = input.failureMessage?.slice(0, 1000) ?? null;
  const emailDeliveryId = input.emailDeliveryId ?? null;

  await prisma.$executeRaw`
    UPDATE WriterDailySummaryDelivery
    SET status = ${input.status},
      emailDeliveryId = ${emailDeliveryId},
      metrics = ${metricsJson},
      failureMessage = ${failureMessage},
      sentAt = ${input.status === "sent" ? new Date() : null},
      updatedAt = CURRENT_TIMESTAMP(3)
    WHERE id = ${input.deliveryId}
  `;
}

async function processWriter(
  writer: WriterRow,
  window: ReturnType<typeof parseSummaryDate>,
) {
  const deliveryId = await claimDelivery(
    writer.id,
    window.summaryDate,
    window.start,
    window.end,
  );

  if (!deliveryId) return "duplicate" as const;

  const metrics = await loadMetrics(writer.id, window.start, window.end);

  if (!hasMeaningfulActivity(metrics)) {
    await updateDelivery({
      deliveryId,
      metrics,
      status: "skipped",
    });
    return "skipped" as const;
  }

  const [topWork, topChapter] = await Promise.all([
    loadTopWork(writer.id, window.start, window.end),
    loadTopChapter(writer.id, window.start, window.end),
  ]);

  try {
    const result = await sendWriterDailySummaryEmail({
      email: writer.email,
      fullName: writer.fullName,
      metrics,
      summaryDateLabel: dateLabel(window.start),
      topChapter,
      topWork,
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
      : "UNKNOWN_WRITER_DAILY_SUMMARY_ERROR";

    await updateDelivery({
      deliveryId,
      failureMessage: message,
      metrics,
      status: "failed",
    });
    console.error("WRITER_DAILY_SUMMARY_SEND_FAILED", {
      authorId: writer.id,
      error: message,
      summaryDate: window.summaryDate,
    });
    return "failed" as const;
  }
}

export async function runWriterDailySummaries(
  summaryDate?: string | null,
) {
  const window = parseSummaryDate(summaryDate);
  const writers = await listEligibleWriters();
  const counts = {
    duplicate: 0,
    failed: 0,
    sent: 0,
    skipped: 0,
  };

  for (const writer of writers) {
    const result = await processWriter(writer, window);
    counts[result] += 1;
  }

  return {
    ...counts,
    eligibleWriters: writers.length,
    periodEnd: window.end.toISOString(),
    periodStart: window.start.toISOString(),
    summaryDate: window.summaryDate,
  };
}
