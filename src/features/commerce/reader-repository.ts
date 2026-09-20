import "server-only";

import { prisma } from "@/lib/prisma";

export async function listReaderPurchasedWorks(readerId: string) {
  return prisma.workEntitlement.findMany({
    where: {
      readerId,
      status: "active",
    },
    orderBy: {
      grantedAt: "desc",
    },
    select: {
      id: true,
      grantedAt: true,
      source: true,
      work: {
        select: {
          id: true,
          slug: true,
          title: true,
          coverUrl: true,
          author: {
            select: {
              displayName: true,
              fullName: true,
            },
          },
        },
      },
      order: {
        select: {
          orderNo: true,
          paidAt: true,
        },
      },
    },
  });
}

export async function listReaderPaymentHistory(readerId: string) {
  return prisma.order.findMany({
    where: {
      readerId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      orderNo: true,
      originalAmount: true,
      discountAmount: true,
      finalAmount: true,
      currency: true,
      couponCodeSnapshot: true,
      status: true,
      createdAt: true,
      paidAt: true,
      refundedAt: true,
      work: {
        select: {
          slug: true,
          title: true,
        },
      },
    },
    take: 200,
  });
}
