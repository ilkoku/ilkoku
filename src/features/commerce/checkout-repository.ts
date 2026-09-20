import "server-only";

import { prisma } from "@/lib/prisma";

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
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (!coupon || coupon.status !== "active") return null;
  if (coupon.startsAt && coupon.startsAt > now) return null;
  if (coupon.endsAt && coupon.endsAt < now) return null;
  if (
    coupon.totalUsageLimit !== null &&
    coupon.usageCount >= coupon.totalUsageLimit
  ) {
    return null;
  }
  if (coupon.redemptions.length >= coupon.perUserUsageLimit) return null;

  const applies =
    coupon.owner === "author"
      ? coupon.authorId === input.authorId && coupon.workScopes.length > 0
      : coupon.scope === "all_paid_works" ||
        (coupon.scope === "selected_works" && coupon.workScopes.length > 0) ||
        (coupon.scope === "selected_authors" &&
          coupon.authorScopes.length > 0);

  if (!applies) return null;

  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    id: coupon.id,
    owner: coupon.owner,
  };
}
