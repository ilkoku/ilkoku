import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { resolveCommissionRate } from "./commission-rates";

/**
 * Read rates INSIDE the same order-creation transaction.
 * Event scopes are sorted newest-first with id as the tie breaker.
 * A reset work event yields the author rule; reset author yields global.
 */
export async function resolveOrderCommissionRate(
  tx: Prisma.TransactionClient,
  authorId: string,
  workId: string,
) {
  const [workEvent, authorEvent] = await Promise.all([
    tx.authorCommissionRateEvent.findFirst({
      where: { authorId, workId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, rateBps: true, active: true },
    }),
    tx.authorCommissionRateEvent.findFirst({
      where: { authorId, workId: null },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, rateBps: true, active: true },
    }),
  ]);
  return resolveCommissionRate({ workEvent, authorEvent });
}
