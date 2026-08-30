import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type DiscoveryAuthorMetrics = {
  commentCount: number;
  completedWorkCount: number;
  country: string | null;
  favoriteCount: number;
  publicWorkCount: number;
  readerCount: number;
  reviewedWorkCount: number;
};

export async function getDiscoveryAuthorMetrics(
  authorIds: readonly string[],
  workWhere: Prisma.WorkWhereInput,
) {
  if (authorIds.length === 0) return new Map<string, DiscoveryAuthorMetrics>();

  const [authors, works] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: [...authorIds] } },
      select: {
        id: true,
        profile: { select: { country: true } },
      },
    }),
    prisma.work.findMany({
      where: {
        ...workWhere,
        authorId: { in: [...authorIds] },
      },
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
        authorId: true,
        chapters: {
          where: { archivedAt: null },
          select: { publishedAt: true, status: true },
        },
        editorReviewStatus: true,
      },
    }),
  ]);

  const countryByAuthor = new Map(
    authors.map((author) => [author.id, author.profile?.country ?? null]),
  );
  const result = new Map<string, DiscoveryAuthorMetrics>();

  for (const authorId of authorIds) {
    result.set(authorId, {
      commentCount: 0,
      completedWorkCount: 0,
      country: countryByAuthor.get(authorId) ?? null,
      favoriteCount: 0,
      publicWorkCount: 0,
      readerCount: 0,
      reviewedWorkCount: 0,
    });
  }

  for (const work of works) {
    const metric = result.get(work.authorId);
    if (!metric) continue;

    const publishedChapterCount = work.chapters.filter(
      (chapter) => chapter.status === "published" && chapter.publishedAt !== null,
    ).length;
    const hasPendingChapter = work.chapters.some(
      (chapter) => chapter.status !== "published" || chapter.publishedAt === null,
    );

    metric.publicWorkCount += 1;
    metric.commentCount += work._count.comments;
    metric.favoriteCount += work._count.favorites;
    metric.readerCount += work._count.readingProgress;
    if (publishedChapterCount > 0 && !hasPendingChapter) {
      metric.completedWorkCount += 1;
    }
    if (work.editorReviewStatus === "completed") {
      metric.reviewedWorkCount += 1;
    }
  }

  return result;
}
