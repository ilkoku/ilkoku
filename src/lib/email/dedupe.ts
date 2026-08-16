import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

const AUTOMATIC_DEDUPE_WINDOW_MS = 30_000;
const CLAIM_TTL_MS = 5 * 60 * 1000;
const EXPLICIT_DEDUPE_EXPIRES_AT = new Date(
  Date.UTC(9999, 11, 31, 23, 59, 59, 999),
);
const ATTACH_WAIT_DELAYS_MS = [50, 100, 200] as const;

type DedupeRow = {
  deliveryId: string | null;
  expiresAt: Date | string;
};

type DedupeInput = {
  channel: string;
  idempotencyKey?: string;
  subject: string;
  template: string;
  to: string;
};

function digest(value: string) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function explicitDedupeKey(idempotencyKey: string) {
  return digest(`explicit:${idempotencyKey.trim()}`);
}

function rowExpiry(row: DedupeRow) {
  return row.expiresAt instanceof Date
    ? row.expiresAt
    : new Date(row.expiresAt);
}

export function buildEmailDedupeKey(
  input: DedupeInput,
  automatic: boolean,
) {
  const explicit = input.idempotencyKey?.trim();

  if (explicit) {
    return explicitDedupeKey(explicit);
  }

  if (!automatic) {
    return null;
  }

  const bucket = Math.floor(
    Date.now() / AUTOMATIC_DEDUPE_WINDOW_MS,
  );

  return digest([
    "automatic-v1",
    input.channel,
    input.to.trim().toLowerCase(),
    input.template.trim(),
    input.subject.trim(),
    String(bucket),
  ].join(":"));
}

async function readDedupeRow(dedupeKey: string) {
  const rows = await prisma.$queryRaw<DedupeRow[]>`
    SELECT deliveryId, expiresAt
    FROM EmailDeliveryDedupe
    WHERE dedupeKey = ${dedupeKey}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function tryTakeOverExpiredClaim(
  dedupeKey: string,
  now: Date,
) {
  const updated = await prisma.$executeRaw`
    UPDATE EmailDeliveryDedupe
    SET expiresAt = ${new Date(now.getTime() + CLAIM_TTL_MS)},
      updatedAt = CURRENT_TIMESTAMP(3)
    WHERE dedupeKey = ${dedupeKey}
      AND deliveryId IS NULL
      AND expiresAt <= ${now}
  `;

  return updated === 1;
}

async function waitForAttachedDelivery(dedupeKey: string) {
  for (const delay of ATTACH_WAIT_DELAYS_MS) {
    await new Promise((resolve) => setTimeout(resolve, delay));

    const row = await readDedupeRow(dedupeKey);
    if (!row) return null;
    if (row.deliveryId) return row.deliveryId;
  }

  return null;
}

export async function claimEmailDeliveryDedupe(
  dedupeKey: string | null,
) {
  if (!dedupeKey) {
    return {
      claimed: true,
      duplicateDeliveryId: null,
    };
  }

  try {
    const now = new Date();
    const inserted = await prisma.$executeRaw`
      INSERT IGNORE INTO EmailDeliveryDedupe (
        id,
        dedupeKey,
        expiresAt,
        createdAt,
        updatedAt
      ) VALUES (
        ${randomUUID()},
        ${dedupeKey},
        ${new Date(now.getTime() + CLAIM_TTL_MS)},
        CURRENT_TIMESTAMP(3),
        CURRENT_TIMESTAMP(3)
      )
    `;

    if (inserted === 1) {
      return {
        claimed: true,
        duplicateDeliveryId: null,
      };
    }

    const existing = await readDedupeRow(dedupeKey);

    if (existing?.deliveryId) {
      return {
        claimed: false,
        duplicateDeliveryId: existing.deliveryId,
      };
    }

    if (
      existing &&
      rowExpiry(existing).getTime() <= now.getTime() &&
      await tryTakeOverExpiredClaim(dedupeKey, now)
    ) {
      return {
        claimed: true,
        duplicateDeliveryId: null,
      };
    }

    const duplicateDeliveryId =
      await waitForAttachedDelivery(dedupeKey);

    if (duplicateDeliveryId) {
      return {
        claimed: false,
        duplicateDeliveryId,
      };
    }

    console.warn("EMAIL_DEDUPE_CLAIM_IN_PROGRESS", {
      dedupeKey,
    });

    return {
      claimed: false,
      duplicateDeliveryId: null,
    };
  } catch (error) {
    console.error("EMAIL_DEDUPE_CLAIM_FAILED", {
      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
    });

    return {
      claimed: true,
      duplicateDeliveryId: null,
    };
  }
}

export async function attachEmailDeliveryDedupe(
  dedupeKey: string | null,
  deliveryId: string,
  options?: {
    persistent?: boolean;
  },
) {
  if (!dedupeKey) return;

  try {
    if (options?.persistent) {
      await prisma.$executeRaw`
        UPDATE EmailDeliveryDedupe
        SET deliveryId = ${deliveryId},
          expiresAt = ${EXPLICIT_DEDUPE_EXPIRES_AT},
          updatedAt = CURRENT_TIMESTAMP(3)
        WHERE dedupeKey = ${dedupeKey}
          AND deliveryId IS NULL
      `;
      return;
    }

    await prisma.$executeRaw`
      UPDATE EmailDeliveryDedupe
      SET deliveryId = ${deliveryId},
        updatedAt = CURRENT_TIMESTAMP(3)
      WHERE dedupeKey = ${dedupeKey}
        AND deliveryId IS NULL
    `;
  } catch (error) {
    console.error("EMAIL_DEDUPE_ATTACH_FAILED", {
      deliveryId,
      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
    });
  }
}

export async function getEmailDeliveryIdForIdempotencyKey(
  idempotencyKey: string,
) {
  const normalized = idempotencyKey.trim();
  if (!normalized) return null;

  const row = await readDedupeRow(
    explicitDedupeKey(normalized),
  );

  return row?.deliveryId ?? null;
}
