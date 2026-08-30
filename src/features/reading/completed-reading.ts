import "server-only";

import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import { getAdultContentAccess } from "@/lib/adult-content-access";
import { prisma } from "@/lib/prisma";

export async function getCompletedReadingForMember(userId: string) {
  const canAccessAdultContent = (
    await getAdultContentAccess(userId)
  ).canAccessAdultContent;

  return prisma.readingProgress.findMany({
    where: {
      completed: true,
      userId,
      chapter: {
        is: {
          archivedAt: null,
          publishedAt: { not: null },
          status: "published",
        },
      },
      work: {
        is: commonDiscoveryWorkWhereFor(canAccessAdultContent),
      },
    },
    orderBy: { completedAt: "desc" },
    select: {
      chapter: { select: { position: true, title: true } },
      completedAt: true,
      progressPercent: true,
      work: {
        select: {
          _count: {
            select: {
              comments: {
                where: { deletedAt: null, status: "visible" },
              },
              favorites: true,
              readingProgress: true,
            },
          },
          author: {
            select: {
              displayName: true,
              fullName: true,
              username: true,
            },
          },
          chapters: {
            where: {
              archivedAt: null,
              publishedAt: { not: null },
              status: "published",
            },
            orderBy: { position: "asc" },
            select: {
              content: true,
              id: true,
              position: true,
              publishedAt: true,
              status: true,
            },
          },
          contentRating: true,
          coverUrl: true,
          description: true,
          editorReviewStatus: true,
          favorites: {
            where: { userId },
            select: { id: true },
            take: 1,
          },
          genre: true,
          id: true,
          language: true,
          publishedAt: true,
          slug: true,
          title: true,
          updatedAt: true,
        },
      },
    },
  });
}
