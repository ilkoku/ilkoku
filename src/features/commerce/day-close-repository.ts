import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildDayCloseFiles, closedDayRange, DAY_CLOSE_MAX_ROWS,
} from "./day-close-export";

/**
 * READ ONLY. Never use this for invoices, payouts or tax postings.
 * Date grouping is by completed transaction time (Istanbul day), not
 * order creation time. A second download does not mutate balances.
 */
export async function getDayClosePackage(day: string, now = new Date()) {
  const period = closedDayRange(day, now);
  if (!period) return { ok: false as const, reason: "Gün sonu için geçmiş ve geçerli bir Türkiye tarihi seçin." };

  const [orders, ledger, refunds] = await Promise.all([
    prisma.order.findMany({
      where: {
        paidAt: { gte: period.start, lt: period.end },
        status: { in: ["paid", "refunded"] },
      },
      orderBy: [{ paidAt: "asc" }, { id: "asc" }],
      take: DAY_CLOSE_MAX_ROWS + 1,
      select: {
        orderNo: true, authorId: true, paidAt: true, refundedAt: true, status: true, currency: true,
        originalAmount: true, discountAmount: true, finalAmount: true,
        couponCodeSnapshot: true,
        legalSnapshot: { select: { sellerMode: true } },
        author: { select: { publicId: true } },
        work: { select: { title: true } },
        commissionRateSnapshot: {
          select: {
            commissionRateBps: true, serviceFeeRateBps: true,
            source: true, sourceEventId: true, calculationVersion: true,
          },
        },
        priceQuoteSnapshot: {
          select: {
            calculationVersion: true, taxTreatment: true, vatRateBasisPoints: true,
            listNetAmount: true, listVatAmount: true, listGrossAmount: true,
            discountGrossAmount: true, payableGrossAmount: true,
          },
        },
        payments: {
          select: { status: true, amount: true, currency: true, completedAt: true },
        },
        // A paid order can have its ledger posted just after midnight.
        // Reconcile against the order's OWN records, not only day ledger.
        financialLedgerEntries: {
          where: { entryType: "sale_gross" },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          take: 2, // one expected; a second entry is an anomaly
          select: { id: true, entryType: true, amount: true, currency: true, createdAt: true },
        },
      },
    }),
    prisma.financialLedger.findMany({
      where: { createdAt: { gte: period.start, lt: period.end } },
      take: DAY_CLOSE_MAX_ROWS + 1,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true, entryType: true, amount: true,
        currency: true, createdAt: true,
        order: { select: { orderNo: true } },
        author: { select: { publicId: true } },
      },
    }),
    prisma.refund.findMany({
      where: {
        status: "processed",
        processedAt: { gte: period.start, lt: period.end },
      },
      take: DAY_CLOSE_MAX_ROWS + 1,
      orderBy: [{ processedAt: "asc" }, { id: "asc" }],
      select: {
        id: true, orderId: true, status: true, processedAt: true,
        amount: true, currency: true,
        order: { select: {
          orderNo: true, finalAmount: true, currency: true, paidAt: true,
        } },
      },
    }),
  ]);

  if (orders.length > DAY_CLOSE_MAX_ROWS || ledger.length > DAY_CLOSE_MAX_ROWS ||
      refunds.length > DAY_CLOSE_MAX_ROWS) {
    return { ok: false as const, reason: "Gün sonu kayıt limiti aşıldı. Eksik paket oluşturulmaz; dönem bölünerek ayrı bir dışa aktarma geliştirilmelidir." };
  }

  // Tax-document review must be resolved AS OF each paid order's timestamp.
  // A review posted after payment cannot retroactively justify a 5% fee.
  const authorIds = [...new Set(orders.map((order) => order.authorId))];
  const reviewEvents = authorIds.length ? await prisma.authorTaxReviewEvent.findMany({
    where: {
      authorId: { in: authorIds },
      reviewedAt: { lt: period.end },
    },
    orderBy: [{ reviewedAt: "desc" }, { id: "desc" }],
    take: DAY_CLOSE_MAX_ROWS + 1,
    select: {
      authorId: true, documentKind: true, decision: true,
      validUntil: true, reviewedAt: true,
    },
  }) : [];
  if (reviewEvents.length > DAY_CLOSE_MAX_ROWS) {
    return { ok: false as const,
      reason: "Yazar mali belge inceleme kaydı sınırı aşıldı; eksik veya yanıltıcı muhasebe paketi oluşturulmaz." };
  }
  const taxHistory = new Map<string, typeof reviewEvents>();
  for (const event of reviewEvents) {
    const events = taxHistory.get(event.authorId) ?? [];
    events.push(event);
    taxHistory.set(event.authorId, events);
  }

  // Historical totals stop at this day's end. A refund processed the next
  // day must NOT retroactively change the original day's daily package.
  const refundsByOrder = refunds.length ? await prisma.refund.groupBy({
    by: ["orderId", "currency"],
    where: {
      orderId: { in: [...new Set(refunds.map((refund) => refund.orderId))] },
      status: "processed",
      processedAt: { lt: period.end },
    },
    _sum: { amount: true },
  }) : [];
  const refundTotals = new Map<string,bigint>();
  const refundCurrencies = new Map<string,Set<string>>();
  for (const row of refundsByOrder) {
    refundTotals.set(row.orderId,
      (refundTotals.get(row.orderId) ?? BigInt(0)) + (row._sum.amount ?? BigInt(0)));
    const currencies = refundCurrencies.get(row.orderId) ?? new Set<string>();
    currencies.add(row.currency);
    refundCurrencies.set(row.orderId,currencies);
  }

  const prepared = buildDayCloseFiles({
    day: period.day,
    orders: orders.map((order) => ({
      orderNo: order.orderNo,
      paidAt: order.paidAt,
      // A later refund belongs in its processing day's refund CSV.
      // It does not retroactively turn a completed sale into a refund
      // within the original sale's closing day.
      status: order.status === "refunded" && order.refundedAt &&
        order.refundedAt >= period.end ? "paid" : order.status,
      sellerMode: order.legalSnapshot?.sellerMode ?? null,
      authorPublicId: order.author.publicId,
      workTitle: order.work.title,
      currency: order.currency,
      originalAmount: order.originalAmount,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
      couponCode: order.couponCodeSnapshot,
      taxReview: (taxHistory.get(order.authorId) ?? []).find((event) =>
        order.paidAt !== null && event.reviewedAt <= order.paidAt) ?? null,
      commission: order.commissionRateSnapshot,
      quote: order.priceQuoteSnapshot,
      payments: order.payments,
    })),
    reconciliationLedger: orders.flatMap((order) =>
      order.financialLedgerEntries.map((entry) => ({
        id: entry.id,
        entryType: entry.entryType,
        amount: entry.amount,
        currency: entry.currency,
        createdAt: entry.createdAt,
        orderNo: order.orderNo,
        authorPublicId: order.author.publicId,
      })),
    ),
    ledger: ledger.map((entry) => ({
      id: entry.id,
      entryType: entry.entryType,
      amount: entry.amount,
      currency: entry.currency,
      createdAt: entry.createdAt,
      orderNo: entry.order?.orderNo ?? null,
      authorPublicId: entry.author?.publicId ?? null,
    })),
    refunds: refunds.map((refund) => ({
      id: refund.id,
      orderNo: refund.order.orderNo,
      amount: refund.amount,
      currency: refund.currency,
      processedAt: refund.processedAt!,
      status: refund.status,
      orderCurrency: refund.order.currency,
      orderFinalAmount: refund.order.finalAmount,
      orderPaidAt: refund.order.paidAt,
      cumulativeProcessedAmount: refundTotals.get(refund.orderId),
      historicalCurrencyMismatch: [...(refundCurrencies.get(refund.orderId) ?? [])]
        .some((currency) => currency !== refund.order.currency),
    })),
  });
  return { ok: true as const, ...prepared };
}
