import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type EmailOperationsSource = "github" | "cloudflare";

const STATE_ID = "hourly";
const LEASE_MS = 8 * 60 * 1000;

function uniqueCollision(error: unknown) {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: unknown }).code === "P2002";
}

export async function beginEmailOperationsCheck(source: EmailOperationsSource) {
  const now = new Date();
  const token = randomUUID();
  const data = {
    leaseToken: token,
    leaseUntil: new Date(now.getTime() + LEASE_MS),
    lastAttemptAt: now,
    lastAttemptSource: source,
  };
  // Conditional write serializes cron invocations from DIFFERENT providers.
  const renewed = await prisma.emailOperationsSchedulerState.updateMany({
    where: {
      id: STATE_ID,
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
    },
    data,
  });
  if (renewed.count === 1) return token;

  try {
    await prisma.emailOperationsSchedulerState.create({
      data: { id: STATE_ID, ...data },
    });
    return token;
  } catch (error) {
    // First-run collision is expected if two schedulers create the row together.
    if (uniqueCollision(error)) return null;
    throw error;
  }
}

export async function finishEmailOperationsCheck(
  token: string,
  startedAtMs: number,
  successful: boolean,
) {
  const now = new Date();
  const updated = await prisma.emailOperationsSchedulerState.updateMany({
    where: { id: STATE_ID, leaseToken: token },
    data: {
      leaseToken: null,
      leaseUntil: null,
      lastDurationMs: Math.max(0, now.getTime() - startedAtMs),
      ...(successful
        ? { lastSuccessAt: now, lastErrorCode: null }
        : { lastFailureAt: now, lastErrorCode: "EMAIL_OPERATIONS_CHECK_FAILED" }),
    },
  });
  if (updated.count !== 1) throw new Error("EMAIL_OPERATIONS_LEASE_LOST");
}
