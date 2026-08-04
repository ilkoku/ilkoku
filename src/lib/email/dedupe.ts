import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

const AUTOMATIC_DEDUPE_WINDOW_MS = 30_000;
const CLAIM_TTL_MS = 5 * 60 * 1000;

type DedupeRow = {
  deliveryId: string | null;
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

export function buildEmailDedupeKey(
  input: DedupeInput,
  automatic: boolean,
) {
  const explicit = input.idempotencyKey?.trim();

  if (explicit) {
    return digest(`explicit:${explicit}`);
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

async function readDeliveryId(dedupeKey: string) {
  const rows = await prisma.$queryRaw<DedupeRow[]>`
    SELECT deliveryId
    FROM EmailDeliveryDedupe
    WHERE dedupeKey = ${dedupeKey}
    LIMIT 1
  `;

  return rows[0]?.deliveryId ?? null;
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
        ${new Date(Date.now() + CLAIM_TTL_MS)},
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

    let duplicateDeliveryId = await readDeliveryId(dedupeKey);

    if (!duplicateDeliveryId) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      duplicateDeliveryId = await readDeliveryId(dedupeKey);
    }

    if (!duplicateDeliveryId) {
      console.warn("EMAIL_DEDUPE_CLAIM_INCOMPLETE", {
        dedupeKey,
      });

      return {
        claimed: true,
        duplicateDeliveryId: null,
      };
    }

    return {
      claimed: false,
      duplicateDeliveryId,
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
) {
  if (!dedupeKey) return;

  try {
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
