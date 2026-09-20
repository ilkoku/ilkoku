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
        },
      },
    },
  });
}
