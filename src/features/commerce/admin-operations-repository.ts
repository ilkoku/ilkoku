import "server-only";

import { prisma } from "@/lib/prisma";
import { getAdminSearchIds } from "@/features/commerce/admin-search-sql";

export type CommerceOrderStatusFilter =
  | "all"
  | "draft"
  | "pending_payment"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export type CommercePaymentStatusFilter =
  | "all"
  | "pending"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded";

export type CommerceRefundStatusFilter =
  | "all"
  | "requested"
  | "approved"
  | "rejected"
  | "processing"
  | "processed";

export type CommerceEntitlementStatusFilter =
  | "all"
  | "active"
  | "revoked"
  | "refunded";

export type CommerceEntitlementSourceFilter =
  | "all"
  | "purchase"
  | "coupon"
  | "admin"
  | "promotion";

function cleanQuery(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 120) : "";
}

export async function listCommerceOrders(input: {
  q?: string;
  status: CommerceOrderStatusFilter;
}) {
  const q = cleanQuery(input.q);
  const ids = q ? await getAdminSearchIds("orders", q) : [];

  return prisma.order.findMany({
    where: {
      ...(input.status === "all" ? {} : { status: input.status }),
      ...(q ? { id: { in: ids } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      orderNo: true,
      originalAmount: true,
      discountAmount: true,
      finalAmount: true,
      authorEarningBaseAmount: true,
      currency: true,
      couponCodeSnapshot: true,
      couponOwnerSnapshot: true,
      status: true,
      createdAt: true,
      paidAt: true,
      cancelledAt: true,
      refundedAt: true,
      work: {
        select: {
          title: true,
          slug: true,
        },
      },
      reader: {
        select: {
          publicId: true,
          fullName: true,
          displayName: true,
        },
      },
      author: {
        select: {
          publicId: true,
          fullName: true,
          displayName: true,
        },
      },
      entitlement: {
        select: {
          status: true,
          grantedAt: true,
          revokedAt: true,
        },
      },
      consent: {
        select: {
          documentVersion: true,
          acceptedAt: true,
        },
      },
      _count: {
        select: {
          payments: true,
          refunds: true,
        },
      },
    },
  });
}

export async function getCommerceOrderStatusCounts() {
  const rows = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return Object.fromEntries(
    rows.map((row) => [row.status, row._count._all]),
  ) as Partial<Record<Exclude<CommerceOrderStatusFilter, "all">, number>>;
}

export async function listCommercePayments(input: {
  q?: string;
  status: CommercePaymentStatusFilter;
}) {
  const q = cleanQuery(input.q);
  const ids = q ? await getAdminSearchIds("payments", q) : [];

  return prisma.payment.findMany({
    where: {
      ...(input.status === "all" ? {} : { status: input.status }),
      ...(q ? { id: { in: ids } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      method: true,
      provider: true,
      providerTransactionId: true,
      amount: true,
      currency: true,
      status: true,
      failureCode: true,
      failureMessage: true,
      createdAt: true,
      completedAt: true,
      order: {
        select: {
          orderNo: true,
          status: true,
          reader: {
            select: {
              publicId: true,
              fullName: true,
              displayName: true,
            },
          },
          work: {
            select: {
              title: true,
              slug: true,
            },
          },
        },
      },
      _count: {
        select: {
          refunds: true,
        },
      },
    },
  });
}

export async function getCommercePaymentStatusCounts() {
  const rows = await prisma.payment.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return Object.fromEntries(
    rows.map((row) => [row.status, row._count._all]),
  ) as Partial<Record<Exclude<CommercePaymentStatusFilter, "all">, number>>;
}

export async function listCommerceRefunds(input: {
  q?: string;
  status: CommerceRefundStatusFilter;
}) {
  const q = cleanQuery(input.q);
  const ids = q ? await getAdminSearchIds("refunds", q) : [];

  return prisma.refund.findMany({
    where: {
      ...(input.status === "all" ? {} : { status: input.status }),
      ...(q ? { id: { in: ids } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      reason: true,
      createdAt: true,
      processedAt: true,
      order: {
        select: {
          orderNo: true,
          status: true,
          reader: {
            select: {
              publicId: true,
              fullName: true,
              displayName: true,
            },
          },
          work: {
            select: {
              title: true,
              slug: true,
            },
          },
        },
      },
      payment: {
        select: {
          method: true,
          provider: true,
          providerTransactionId: true,
          status: true,
        },
      },
    },
  });
}

export async function getCommerceRefundStatusCounts() {
  const rows = await prisma.refund.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return Object.fromEntries(
    rows.map((row) => [row.status, row._count._all]),
  ) as Partial<Record<Exclude<CommerceRefundStatusFilter, "all">, number>>;
}


export async function listCommerceEntitlements(input: {
  q?: string;
  source: CommerceEntitlementSourceFilter;
  status: CommerceEntitlementStatusFilter;
}) {
  const q = cleanQuery(input.q);
  const ids = q ? await getAdminSearchIds("entitlements", q) : [];

  return prisma.workEntitlement.findMany({
    where: {
      ...(input.status === "all" ? {} : { status: input.status }),
      ...(input.source === "coupon"
        ? {
            // Coupon-funded orders retain source=purchase because access came
            // from an order. Include them in the Coupon operational view
            // without changing immutable orders or entitlement provenance.
            // AND keeps the coupon condition when the search query adds OR.
            AND: [
              {
                OR: [
                  { source: "coupon" as const },
                  {
                    source: "purchase" as const,
                    order: { is: { couponCodeSnapshot: { not: null } } },
                  },
                ],
              },
            ],
          }
        : input.source === "all"
          ? {}
          : { source: input.source }),
      ...(q ? { id: { in: ids } } : {}),
    },
    orderBy: { grantedAt: "desc" },
    take: 200,
    select: {
      id: true,
      source: true,
      status: true,
      grantedAt: true,
      revokedAt: true,
      createdAt: true,
      updatedAt: true,
      reader: {
        select: {
          publicId: true,
          fullName: true,
          displayName: true,
        },
      },
      work: {
        select: {
          title: true,
          slug: true,
          saleConfiguration: {
            select: {
              saleModel: true,
              status: true,
            },
          },
        },
      },
      order: {
        select: {
          orderNo: true,
          couponCodeSnapshot: true,
          status: true,
          finalAmount: true,
          currency: true,
          paidAt: true,
        },
      },
    },
  });
}

export async function getCommerceEntitlementStatusCounts() {
  const rows = await prisma.workEntitlement.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return Object.fromEntries(
    rows.map((row) => [row.status, row._count._all]),
  ) as Partial<
    Record<Exclude<CommerceEntitlementStatusFilter, "all">, number>
  >;
}
