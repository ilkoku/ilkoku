import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

const LEASE_KEY = "book-index-scheduler";
const LEASE_DURATION_MS = 10 * 60_000;

export type BookIndexSchedulerLease =
  | {
      acquired: true;
      token: string;
      lockedUntil: Date;
    }
  | {
      acquired: false;
      token: null;
      lockedUntil: Date | null;
    };

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: unknown }).code === "P2002"
  );
}

export async function acquireBookIndexSchedulerLease(
  now = new Date(),
): Promise<BookIndexSchedulerLease> {
  const token = randomUUID();
  const lockedUntil = new Date(now.getTime() + LEASE_DURATION_MS);

  const renewed = await prisma.bookIndexSchedulerLease.updateMany({
    where: {
      leaseKey: LEASE_KEY,
      lockedUntil: { lte: now },
    },
    data: {
      token,
      lockedUntil,
    },
  });

  if (renewed.count === 1) {
    return { acquired: true, token, lockedUntil };
  }

  try {
    await prisma.bookIndexSchedulerLease.create({
      data: {
        leaseKey: LEASE_KEY,
        token,
        lockedUntil,
      },
    });

    return { acquired: true, token, lockedUntil };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const existing = await prisma.bookIndexSchedulerLease.findUnique({
      where: { leaseKey: LEASE_KEY },
      select: { lockedUntil: true },
    });

    return {
      acquired: false,
      token: null,
      lockedUntil: existing?.lockedUntil ?? null,
    };
  }
}

export async function releaseBookIndexSchedulerLease(token: string) {
  await prisma.bookIndexSchedulerLease.deleteMany({
    where: {
      leaseKey: LEASE_KEY,
      token,
    },
  });
}
