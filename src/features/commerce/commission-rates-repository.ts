import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
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

/**
 * Read-only current commission preview for the signed-in writer.
 * Never use current rate rules to recalculate historic orders: each order
 * keeps its own frozen OrderCommissionRateSnapshot.
 */
export async function getWriterCommissionPreviewContext(authorId: string, requestedWorkId?: string) {
  const [authorEvent, works] = await Promise.all([
    prisma.authorCommissionRateEvent.findFirst({
      where: { authorId, workId: null },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, rateBps: true, active: true },
    }),
    prisma.work.findMany({
      where: {
        authorId,
        archivedAt: null,
        saleConfiguration: { is: { saleModel: "paid" } },
      },
      take: 100,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        saleConfiguration: {
          select: {
            priceAmount: true,
            priceTaxTreatment: true,
            currency: true,
          },
        },
        commissionRateEvents: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { id: true, rateBps: true, active: true },
        },
      },
    }),
  ]);
  // Work selection comes from the writer's own works, never a bare work ID.
  const selectedWork = requestedWorkId
    ? works.find((work) => work.id === requestedWorkId) ?? null
    : null;
  const rate = resolveCommissionRate({
    authorEvent,
    workEvent: selectedWork?.commissionRateEvents[0] ?? null,
  });
  const configuration = selectedWork?.saleConfiguration;
  const savedNetPrice = configuration?.priceTaxTreatment === "net_plus_vat" &&
    configuration.currency === "TRY" &&
    configuration.priceAmount !== null &&
    configuration.priceAmount > BigInt(0)
    ? configuration.priceAmount : null;

  return {
    works: works.map((work) => ({ id: work.id, title: work.title })),
    selectedWork: selectedWork ? { id: selectedWork.id, title: selectedWork.title } : null,
    rate,
    savedNetPrice,
    invalidWorkSelection: Boolean(requestedWorkId && !selectedWork),
    legacyPriceSelection: Boolean(selectedWork && savedNetPrice === null),
  };
}
