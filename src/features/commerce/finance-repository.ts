import "server-only";

import { prisma } from "@/lib/prisma";

export type FinanceLedgerTypeFilter =
  | "all"
  | "sale_gross"
  | "author_coupon_discount"
  | "platform_coupon_discount"
  | "payment_provider_fee"
  | "platform_commission"
  | "author_earning"
  | "refund"
  | "tax_withholding"
  | "adjustment"
  | "payout";

export type FinancePayoutStatusFilter =
  | "all"
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "held";

function cleanQuery(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 120) : "";
}

export async function getFinanceOverview(currency = "TRY") {
  const [ledger, balances, payoutCount] = await Promise.all([
    prisma.financialLedger.findMany({
      where: { currency },
      select: {
        amount: true,
        entryType: true,
      },
    }),
    prisma.authorBalance.findMany({
      where: { currency },
      select: {
        pendingAmount: true,
        availableAmount: true,
        processingAmount: true,
        paidAmount: true,
      },
    }),
    prisma.payout.count({ where: { currency } }),
  ]);

  const sum = (type: (typeof ledger)[number]["entryType"]) =>
    ledger
      .filter((entry) => entry.entryType === type)
      .reduce((total, entry) => total + entry.amount, BigInt(0));

  const balanceSum = (
    field: "pendingAmount" | "availableAmount" | "processingAmount" | "paidAmount",
  ) =>
    balances.reduce((total, balance) => total + balance[field], BigInt(0));

  return {
    currency,
    grossSales: sum("sale_gross"),
    authorEarnings: sum("author_earning"),
    platformCommission: sum("platform_commission"),
    platformCampaignCost: sum("platform_coupon_discount"),
    providerFees: sum("payment_provider_fee"),
    refunds: sum("refund"),
    taxWithholding: sum("tax_withholding"),
    pendingAuthor: balanceSum("pendingAmount"),
    availableAuthor: balanceSum("availableAmount"),
    processingAuthor: balanceSum("processingAmount"),
    paidAuthor: balanceSum("paidAmount"),
    payoutCount,
    ledgerEntryCount: ledger.length,
  };
}

export async function listFinanceLedger(input: {
  q?: string;
  type: FinanceLedgerTypeFilter;
}) {
  const q = cleanQuery(input.q);

  return prisma.financialLedger.findMany({
    where: {
      ...(input.type === "all" ? {} : { entryType: input.type }),
      ...(q
        ? {
            OR: [
              { idempotencyKey: { contains: q } },
              { order: { is: { orderNo: { contains: q } } } },
              { work: { is: { title: { contains: q } } } },
              { author: { is: { publicId: { contains: q } } } },
              { author: { is: { fullName: { contains: q } } } },
              { author: { is: { displayName: { contains: q } } } },
              { coupon: { is: { code: { contains: q } } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      idempotencyKey: true,
      entryType: true,
      amount: true,
      currency: true,
      metadata: true,
      createdAt: true,
      order: {
        select: {
          orderNo: true,
          status: true,
        },
      },
      work: {
        select: {
          title: true,
          slug: true,
        },
      },
      author: {
        select: {
          publicId: true,
          fullName: true,
          displayName: true,
        },
      },
      coupon: {
        select: {
          code: true,
          owner: true,
        },
      },
      payout: {
        select: {
          id: true,
          status: true,
          reference: true,
        },
      },
    },
  });
}

export async function getFinanceLedgerTypeCounts() {
  const rows = await prisma.financialLedger.groupBy({
    by: ["entryType"],
    _count: { _all: true },
  });

  return Object.fromEntries(
    rows.map((row) => [row.entryType, row._count._all]),
  ) as Partial<Record<Exclude<FinanceLedgerTypeFilter, "all">, number>>;
}

export async function listAuthorBalances(q?: string) {
  const query = cleanQuery(q);

  return prisma.authorBalance.findMany({
    where: {
      currency: "TRY",
      ...(query
        ? {
            author: {
              is: {
                OR: [
                  { publicId: { contains: query } },
                  { fullName: { contains: query } },
                  { displayName: { contains: query } },
                ],
              },
            },
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
    select: {
      id: true,
      currency: true,
      pendingAmount: true,
      availableAmount: true,
      processingAmount: true,
      paidAmount: true,
      updatedAt: true,
      author: {
        select: {
          publicId: true,
          fullName: true,
          displayName: true,
        },
      },
    },
  });
}

export async function listFinancePayouts(input: {
  q?: string;
  status: FinancePayoutStatusFilter;
}) {
  const q = cleanQuery(input.q);

  return prisma.payout.findMany({
    where: {
      ...(input.status === "all" ? {} : { status: input.status }),
      ...(q
        ? {
            OR: [
              { reference: { contains: q } },
              { method: { contains: q } },
              { author: { is: { publicId: { contains: q } } } },
              { author: { is: { fullName: { contains: q } } } },
              { author: { is: { displayName: { contains: q } } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      periodStart: true,
      periodEnd: true,
      method: true,
      reference: true,
      createdAt: true,
      updatedAt: true,
      paidAt: true,
      author: {
        select: {
          publicId: true,
          fullName: true,
          displayName: true,
        },
      },
      _count: {
        select: {
          ledgerEntries: true,
        },
      },
    },
  });
}

export async function getFinancePayoutStatusCounts() {
  const rows = await prisma.payout.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return Object.fromEntries(
    rows.map((row) => [row.status, row._count._all]),
  ) as Partial<Record<Exclude<FinancePayoutStatusFilter, "all">, number>>;
}

export async function listPlatformCampaignCosts(q?: string) {
  const query = cleanQuery(q);

  return prisma.financialLedger.findMany({
    where: {
      currency: "TRY",
      entryType: "platform_coupon_discount",
      ...(query
        ? {
            OR: [
              { order: { is: { orderNo: { contains: query } } } },
              { work: { is: { title: { contains: query } } } },
              { coupon: { is: { code: { contains: query } } } },
              { author: { is: { publicId: { contains: query } } } },
              { author: { is: { fullName: { contains: query } } } },
              { author: { is: { displayName: { contains: query } } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      amount: true,
      currency: true,
      metadata: true,
      createdAt: true,
      order: {
        select: {
          orderNo: true,
          originalAmount: true,
          finalAmount: true,
          authorEarningBaseAmount: true,
        },
      },
      work: {
        select: {
          title: true,
        },
      },
      author: {
        select: {
          publicId: true,
          fullName: true,
          displayName: true,
        },
      },
      coupon: {
        select: {
          code: true,
          discountType: true,
          discountValue: true,
        },
      },
    },
  });
}

export async function listAuthorEarningLedger(q?: string) {
  const query = cleanQuery(q);

  return prisma.financialLedger.findMany({
    where: {
      currency: "TRY",
      entryType: "author_earning",
      ...(query
        ? {
            OR: [
              { order: { is: { orderNo: { contains: query } } } },
              { work: { is: { title: { contains: query } } } },
              { author: { is: { publicId: { contains: query } } } },
              { author: { is: { fullName: { contains: query } } } },
              { author: { is: { displayName: { contains: query } } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      amount: true,
      currency: true,
      createdAt: true,
      order: {
        select: {
          orderNo: true,
          originalAmount: true,
          discountAmount: true,
          finalAmount: true,
          authorEarningBaseAmount: true,
        },
      },
      work: {
        select: {
          title: true,
        },
      },
      author: {
        select: {
          publicId: true,
          fullName: true,
          displayName: true,
        },
      },
    },
  });
}

export async function listPlatformIncomeLedger(q?: string) {
  const query = cleanQuery(q);

  return prisma.financialLedger.findMany({
    where: {
      currency: "TRY",
      entryType: "platform_commission",
      ...(query
        ? {
            OR: [
              { order: { is: { orderNo: { contains: query } } } },
              { work: { is: { title: { contains: query } } } },
              { author: { is: { publicId: { contains: query } } } },
              { author: { is: { fullName: { contains: query } } } },
              { author: { is: { displayName: { contains: query } } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      amount: true,
      currency: true,
      createdAt: true,
      order: {
        select: {
          orderNo: true,
          originalAmount: true,
          finalAmount: true,
        },
      },
      work: {
        select: {
          title: true,
        },
      },
      author: {
        select: {
          publicId: true,
          fullName: true,
          displayName: true,
        },
      },
    },
  });
}

export async function getFinanceReconciliationSnapshot() {
  const [
    paidOrderCount,
    paidOrders,
    grossEntries,
    activeEntitlements,
    successfulPayments,
    pendingPayments,
    pendingOrders,
  ] = await Promise.all([
    prisma.order.count({ where: { status: "paid" } }),
    prisma.order.findMany({
      where: { status: "paid" },
      select: {
        id: true,
        orderNo: true,
        finalAmount: true,
        currency: true,
        entitlement: { select: { status: true } },
        financialLedgerEntries: {
          where: { entryType: "sale_gross" },
          select: { id: true },
        },
      },
      take: 500,
      orderBy: { createdAt: "desc" },
    }),
    prisma.financialLedger.count({ where: { entryType: "sale_gross" } }),
    prisma.workEntitlement.count({ where: { status: "active" } }),
    prisma.payment.count({ where: { status: "succeeded" } }),
    prisma.payment.count({ where: { status: "pending" } }),
    prisma.order.count({ where: { status: "pending_payment" } }),
  ]);

  const paidWithoutGrossLedger = paidOrders.filter(
    (order) => order.financialLedgerEntries.length === 0,
  );
  const paidWithoutActiveEntitlement = paidOrders.filter(
    (order) => order.entitlement?.status !== "active",
  );

  return {
    paidOrderCount,
    grossEntryCount: grossEntries,
    activeEntitlementCount: activeEntitlements,
    successfulPaymentCount: successfulPayments,
    pendingPaymentCount: pendingPayments,
    pendingOrderCount: pendingOrders,
    paidWithoutGrossLedger,
    paidWithoutActiveEntitlement,
  };
}

export async function getWriterFinanceOverview(authorId: string) {
  const [ledger, balance, orders, paidWorks] = await Promise.all([
    prisma.financialLedger.findMany({
      where: { authorId, currency: "TRY" },
      select: {
        amount: true,
        entryType: true,
        createdAt: true,
        workId: true,
        orderId: true,
        work: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.authorBalance.findUnique({
      where: {
        authorId_currency: {
          authorId,
          currency: "TRY",
        },
      },
      select: {
        pendingAmount: true,
        availableAmount: true,
        processingAmount: true,
        paidAmount: true,
      },
    }),
    prisma.order.findMany({
      where: {
        authorId,
        status: { in: ["paid", "refunded"] },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        orderNo: true,
        originalAmount: true,
        discountAmount: true,
        finalAmount: true,
        authorEarningBaseAmount: true,
        currency: true,
        couponOwnerSnapshot: true,
        status: true,
        paidAt: true,
        refundedAt: true,
        work: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    }),
    prisma.work.findMany({
      where: {
        authorId,
        archivedAt: null,
        saleConfiguration: {
          is: {
            saleModel: "paid",
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        saleConfiguration: {
          select: {
            priceAmount: true,
            currency: true,
            status: true,
          },
        },
        _count: {
          select: {
            commerceOrders: {
              where: { status: "paid" },
            },
          },
        },
      },
    }),
  ]);

  const sum = (types: Array<(typeof ledger)[number]["entryType"]>) =>
    ledger
      .filter((entry) => types.includes(entry.entryType))
      .reduce((total, entry) => total + entry.amount, BigInt(0));

  const workMap = new Map<
    string,
    {
      workId: string;
      title: string;
      grossSales: bigint;
      authorEarnings: bigint;
      providerFees: bigint;
      platformCommission: bigint;
      refunds: bigint;
      taxWithholding: bigint;
      adjustments: bigint;
      priceAmount: bigint | null;
      currency: string;
      saleStatus: "draft" | "ready" | "active" | "paused";
      unitsSold: number;
    }
  >();

  for (const work of paidWorks) {
    const configuration = work.saleConfiguration;
    if (!configuration) continue;

    workMap.set(work.id, {
      workId: work.id,
      title: work.title,
      grossSales: BigInt(0),
      authorEarnings: BigInt(0),
      providerFees: BigInt(0),
      platformCommission: BigInt(0),
      refunds: BigInt(0),
      taxWithholding: BigInt(0),
      adjustments: BigInt(0),
      priceAmount: configuration.priceAmount,
      currency: configuration.currency,
      saleStatus: configuration.status,
      unitsSold: work._count.commerceOrders,
    });
  }

  for (const entry of ledger) {
    if (!entry.workId || !entry.work) continue;
    const current = workMap.get(entry.workId) ?? {
      workId: entry.workId,
      title: entry.work.title,
      grossSales: BigInt(0),
      authorEarnings: BigInt(0),
      providerFees: BigInt(0),
      platformCommission: BigInt(0),
      refunds: BigInt(0),
      taxWithholding: BigInt(0),
      adjustments: BigInt(0),
      priceAmount: null,
      currency: "TRY",
      saleStatus: "draft",
      unitsSold: 0,
    };

    if (entry.entryType === "sale_gross") current.grossSales += entry.amount;
    if (entry.entryType === "author_earning")
      current.authorEarnings += entry.amount;
    if (entry.entryType === "payment_provider_fee")
      current.providerFees += entry.amount;
    if (entry.entryType === "platform_commission")
      current.platformCommission += entry.amount;
    if (entry.entryType === "refund") current.refunds += entry.amount;
    if (entry.entryType === "tax_withholding")
      current.taxWithholding += entry.amount;
    if (entry.entryType === "adjustment")
      current.adjustments += entry.amount;

    workMap.set(entry.workId, current);
  }

  return {
    currency: "TRY",
    grossSales: sum(["sale_gross"]),
    providerFees: sum(["payment_provider_fee"]),
    platformCommission: sum(["platform_commission"]),
    refunds: sum(["refund"]),
    taxWithholding: sum(["tax_withholding"]),
    authorEarnings: sum(["author_earning"]),
    balance: balance ?? {
      pendingAmount: BigInt(0),
      availableAmount: BigInt(0),
      processingAmount: BigInt(0),
      paidAmount: BigInt(0),
    },
    byWork: Array.from(workMap.values()).sort((a, b) =>
      a.title.localeCompare(b.title, "tr"),
    ),
    recentOrders: orders,
  };
}
