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

/**
 * Reader-owned order detail. The immutable seller and consent snapshots must
 * be read from the order itself, never the seller's current work assignment.
 */
export async function getReaderOrderDetail(readerId: string, orderNo: string) {
  return prisma.order.findFirst({
    where: { readerId, orderNo },
    select: {
      id: true,
      orderNo: true,
      status: true,
      originalAmount: true,
      discountAmount: true,
      finalAmount: true,
      currency: true,
      couponCodeSnapshot: true,
      couponOwnerSnapshot: true,
      createdAt: true,
      paidAt: true,
      work: { select: { title: true, slug: true } },
      entitlement: { select: { status: true } },
      priceQuoteSnapshot: {
        select: {
          taxTreatment: true,
          vatRateBasisPoints: true,
          listNetAmount: true,
          listVatAmount: true,
          listGrossAmount: true,
          discountGrossAmount: true,
          payableGrossAmount: true,
        },
      },
      legalSnapshot: {
        select: {
          sellerMode: true,
          sellerName: true,
          sellerAddress: true,
          sellerEmail: true,
        },
      },
      consent: {
        select: {
          documentVersion: true,
          acceptedAt: true,
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
