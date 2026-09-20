import "server-only";

import { prisma } from "@/lib/prisma";
import { validateCouponRules } from "./coupon-rules";

export async function getCheckoutWorkBySlug(slug: string, readerId: string) {
  return prisma.work.findFirst({
    where: {
      slug,
      archivedAt: null,
      isActive: true,
      publishedAt: { not: null },
      status: "published",
      visibility: "public",
      author: {
        is: {
          deletedAt: null,
          status: "active",
        },
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      authorId: true,
      author: {
        select: {
          displayName: true,
          fullName: true,
        },
      },
      saleConfiguration: {
        select: {
          saleModel: true,
          priceAmount: true,
          currency: true,
          status: true,
        },
      },
      entitlements: {
        where: {
          readerId,
          status: "active",
        },
        select: {
          id: true,
          grantedAt: true,
        },
        take: 1,
      },
    },
  });
}

export async function getApplicableCheckoutCoupon(input: {
  authorId: string;
  code: string;
  readerId: string;
  workId: string;
}) {
  const normalizedCode = input.code.trim().toUpperCase();
  if (!normalizedCode) return null;

  const now = new Date();
  const coupon = await prisma.coupon.findUnique({
    where: {
      code: normalizedCode,
    },
    select: {
      id: true,
      code: true,
      owner: true,
      authorId: true,
      discountType: true,
      discountValue: true,
      scope: true,
      status: true,
      startsAt: true,
      endsAt: true,
      totalUsageLimit: true,
      perUserUsageLimit: true,
      usageCount: true,
      workScopes: {
        where: {
          workId: input.workId,
        },
        select: {
          workId: true,
        },
      },
      authorScopes: {
        where: {
          authorId: input.authorId,
        },
        select: {
          authorId: true,
        },
      },
      redemptions: {
        where: {
          readerId: input.readerId,
          status: { in: ["reserved", "used"] },
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (!coupon) return null;

  const reservedCount = await prisma.couponRedemption.count({
    where: {
      couponId: coupon.id,
      status: "reserved",
    },
  });

  const validation = validateCouponRules(
    {
      authorId: coupon.authorId,
      authorScopeMatch: coupon.authorScopes.length > 0,
      endsAt: coupon.endsAt,
      owner: coupon.owner,
      perUserUsageLimit: coupon.perUserUsageLimit,
      scope: coupon.scope,
      startsAt: coupon.startsAt,
      status: coupon.status,
      totalUsageLimit: coupon.totalUsageLimit,
      usageCount: coupon.usageCount + reservedCount,
      userUsageCount: coupon.redemptions.length,
      workAuthorId: input.authorId,
      workScopeMatch: coupon.workScopes.length > 0,
    },
    now,
  );

  if (!validation.valid) return null;

  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    id: coupon.id,
    owner: coupon.owner,
  };
}
