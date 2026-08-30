import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  adultContentWorkVisibility,
  getAdultContentAccess,
} from "@/lib/adult-content-access";
import { prisma } from "@/lib/prisma";

function publicWorkWhere(canAccessAdultContent: boolean): Prisma.WorkWhereInput {
  return {
    archivedAt: null,
    ...adultContentWorkVisibility(canAccessAdultContent),
    publishedAt: { not: null },
    status: "published",
    visibility: "public",
  };
}

function continueWorkSelect(userId: string) {
  return {
    _count: {
      select: {
        comments: {
          where: { deletedAt: null, status: "visible" as const },
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
        status: "published" as const,
      },
      orderBy: { position: "asc" as const },
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
  } as const;
}

/**
 * Okumaya Devam Et kaynağı.
 *
 * Anlamlı yüzdelik ilerleme ReadingProgress üzerinden gelir. Bir okur bölümü
 * açmış fakat 20 sn / %10 tracker eşiğini tamamlamadan ayrılmışsa ReadingAccess
 * güvenli geri dönüş kaynağıdır ve eser %0 ile masaya alınır.
 */
export async function getContinueReadingForMember(
  userId: string,
  take = 6,
) {
  const boundedTake = Math.min(100, Math.max(1, take));
  const canAccessAdultContent = (
    await getAdultContentAccess(userId)
  ).canAccessAdultContent;
  const workSelect = continueWorkSelect(userId);

  const progressRecords = await prisma.readingProgress.findMany({
    where: {
      completed: false,
      userId,
      chapter: {
        is: {
          archivedAt: null,
          publishedAt: { not: null },
          status: "published",
        },
      },
      work: { is: publicWorkWhere(canAccessAdultContent) },
    },
    orderBy: { lastReadAt: "desc" },
    select: {
      chapter: { select: { position: true, title: true } },
      lastReadAt: true,
      progressPercent: true,
      work: { select: workSelect },
    },
    take: boundedTake,
  });

  const rows = progressRecords.map((progress) => ({
    row: {
      chapter: progress.chapter,
      progressPercent: progress.progressPercent,
      work: progress.work,
    },
    seenAt: progress.lastReadAt,
  }));

  if (rows.length < boundedTake) {
    const accessCandidates = await prisma.readingAccess.findMany({
      where: {
        userId,
        chapter: {
          is: {
            archivedAt: null,
            publishedAt: { not: null },
            status: "published",
          },
        },
        work: {
          is: {
            ...publicWorkWhere(canAccessAdultContent),
            readingProgress: {
              none: { userId },
            },
          },
        },
      },
      orderBy: { lastSeenAt: "desc" },
      select: {
        chapter: { select: { position: true, title: true } },
        lastSeenAt: true,
        work: { select: workSelect },
      },
      take: Math.max(12, (boundedTake - rows.length) * 4),
    });

    const seenWorkIds = new Set(rows.map(({ row }) => row.work.id));

    for (const access of accessCandidates) {
      if (seenWorkIds.has(access.work.id)) continue;

      seenWorkIds.add(access.work.id);
      rows.push({
        row: {
          chapter: access.chapter,
          progressPercent: 0,
          work: access.work,
        },
        seenAt: access.lastSeenAt,
      });

      if (rows.length >= boundedTake) break;
    }
  }

  return rows
    .sort((left, right) => right.seenAt.getTime() - left.seenAt.getTime())
    .slice(0, boundedTake)
    .map(({ row }) => row);
}
