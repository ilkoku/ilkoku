import "server-only";

import { prisma } from "@/lib/prisma";

export async function getAuthorCommerceWorks(authorId: string) {
  return prisma.work.findMany({
    where: {
      authorId,
      archivedAt: null,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      publicId: true,
      title: true,
      coverUrl: true,
      status: true,
      updatedAt: true,
      _count: {
        select: {
          chapters: {
            where: { archivedAt: null },
          },
        },
      },
      saleConfiguration: {
        select: {
          saleModel: true,
          priceAmount: true,
          currency: true,
          status: true,
          activatedAt: true,
        },
      },
    },
  });
}

export async function getAuthorCommerceWork(authorId: string, workId: string) {
  return prisma.work.findFirst({
    where: {
      id: workId,
      authorId,
      archivedAt: null,
    },
    select: {
      id: true,
      publicId: true,
      title: true,
      coverUrl: true,
      status: true,
      updatedAt: true,
      chapters: {
        where: { archivedAt: null },
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          position: true,
          status: true,
          commerceAccess: {
            select: {
              accessType: true,
            },
          },
        },
      },
      saleConfiguration: {
        select: {
          saleModel: true,
          priceAmount: true,
          currency: true,
          status: true,
          agreementVersion: true,
          confirmedAt: true,
          activatedAt: true,
          updatedAt: true,
        },
      },
      publicationConsents: {
        orderBy: { confirmedAt: "desc" },
        take: 1,
        select: {
          publicationModel: true,
          confirmedAt: true,
        },
      },
    },
  });
}


export async function listAuthorCoupons(authorId: string) {
  return prisma.coupon.findMany({
    where: {
      owner: "author",
      authorId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      code: true,
      discountType: true,
      discountValue: true,
      status: true,
      startsAt: true,
      endsAt: true,
      totalUsageLimit: true,
      perUserUsageLimit: true,
      usageCount: true,
      workScopes: {
        select: {
          work: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });
}


export async function listPlatformCoupons() {
  return prisma.coupon.findMany({
    where: {
      owner: "platform",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      code: true,
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
        select: {
          work: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      authorScopes: {
        select: {
          author: {
            select: {
              id: true,
              displayName: true,
              fullName: true,
            },
          },
        },
      },
    },
  });
}

export async function listPlatformCouponPaidWorks() {
  return prisma.work.findMany({
    where: {
      archivedAt: null,
      saleConfiguration: {
        is: {
          saleModel: "paid",
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      title: true,
      author: {
        select: {
          displayName: true,
          fullName: true,
        },
      },
      saleConfiguration: {
        select: {
          priceAmount: true,
          currency: true,
          status: true,
        },
      },
    },
    take: 500,
  });
}

export async function listPlatformCouponWriters() {
  return prisma.user.findMany({
    where: {
      role: "writer",
      status: "active",
      deletedAt: null,
      works: {
        some: {
          archivedAt: null,
          saleConfiguration: {
            is: {
              saleModel: "paid",
            },
          },
        },
      },
    },
    orderBy: {
      fullName: "asc",
    },
    select: {
      id: true,
      displayName: true,
      fullName: true,
    },
    take: 500,
  });
}
