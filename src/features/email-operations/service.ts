import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const STALE_PENDING_MS = 10 * 60 * 1000;
const FAILURE_ALERT_THRESHOLD = 3;

type CountRow = {
  count: bigint | number | string | null;
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

function hourlyAlertId(now: Date) {
  const hour = now.toISOString().slice(0, 13);
  return createHash("sha256")
    .update(`email-operations:${hour}`)
    .digest("hex")
    .slice(0, 32);
}

async function unresolvedFailureCount() {
  const rows = await prisma.$queryRaw<CountRow[]>`
    SELECT COUNT(*) AS count
    FROM EmailDelivery delivery
    WHERE delivery.status = 'failed'
      AND NOT EXISTS (
        SELECT 1
        FROM EmailDeliveryRetry retryRecord
        WHERE retryRecord.sourceDeliveryId = delivery.id
          AND retryRecord.status = 'sent'
      )
  `;

  return toNumber(rows[0]?.count ?? 0);
}

async function notifyAdmins(input: {
  alertId: string;
  failedLastHour: number;
  staleMarked: number;
  unresolvedFailed: number;
}) {
  const admins = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: "admin",
      status: "active",
    },
    select: {
      id: true,
    },
  });

  let notificationsCreated = 0;

  for (const admin of admins) {
    const existing = await prisma.notification.findFirst({
      where: {
        relatedEntityId: input.alertId,
        relatedEntityType: "EmailOperationsAlert",
        type: "system",
        userId: admin.id,
      },
      select: {
        id: true,
      },
    });

    if (existing) continue;

    await prisma.notification.create({
      data: {
        message: [
          `Son bir saatte ${input.failedLastHour} başarısız gönderim`,
          `${input.staleMarked} zaman aşımına alınan kayıt`,
          `toplam ${input.unresolvedFailed} çözümlenmemiş hata var.`,
        ].join(", "),
        relatedEntityId: input.alertId,
        relatedEntityType: "EmailOperationsAlert",
        title: "E-posta operasyon uyarısı",
        type: "system",
        userId: admin.id,
      },
    });

    notificationsCreated += 1;
  }

  return notificationsCreated;
}

export async function runEmailOperationsCheck() {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_PENDING_MS);
  const hourStart = new Date(now.getTime() - 60 * 60 * 1000);

  const staleUpdate = await prisma.emailDelivery.updateMany({
    where: {
      attemptedAt: {
        lte: staleBefore,
      },
      status: "pending",
    },
    data: {
      failureCode: "DELIVERY_STALLED",
      failureMessage:
        "Gönderim 10 dakika içinde tamamlanmadığı için operasyon kontrolü tarafından başarısız olarak işaretlendi.",
      status: "failed",
    },
  });

  const [failedLastHour, pendingCount, unresolvedFailed] =
    await Promise.all([
      prisma.emailDelivery.count({
        where: {
          attemptedAt: {
            gte: hourStart,
          },
          status: "failed",
        },
      }),
      prisma.emailDelivery.count({
        where: {
          status: "pending",
        },
      }),
      unresolvedFailureCount(),
    ]);

  try {
    await prisma.$executeRaw`
      DELETE FROM EmailDeliveryDedupe
      WHERE expiresAt < DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 1 DAY)
    `;
  } catch (error) {
    console.error("EMAIL_DEDUPE_CLEANUP_FAILED", {
      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
    });
  }

  const shouldAlert =
    failedLastHour >= FAILURE_ALERT_THRESHOLD
    || staleUpdate.count > 0;

  const notificationsCreated = shouldAlert
    ? await notifyAdmins({
        alertId: hourlyAlertId(now),
        failedLastHour,
        staleMarked: staleUpdate.count,
        unresolvedFailed,
      })
    : 0;

  return {
    checkedAt: now.toISOString(),
    failedLastHour,
    notificationsCreated,
    pendingCount,
    staleMarked: staleUpdate.count,
    unresolvedFailed,
  };
}
