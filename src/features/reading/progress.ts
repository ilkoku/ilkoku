import type { PublicChapterDetail } from "@/features/works/types";
import { prisma } from "@/lib/prisma";

const publicWorkWhere = {
  archivedAt: null,
  publishedAt: {
    not: null,
  },
  status: "published" as const,
  visibility: "public" as const,
};

export async function recordReadingProgress(
  userId: string,
  chapter: PublicChapterDetail,
) {
  const chapterIndex = chapter.work.chapters.findIndex(
    (item) => item.id === chapter.id,
  );

  if (chapterIndex < 0 || chapter.work.chapters.length === 0) {
    return null;
  }

  const progressPercent = Math.min(
    100,
    Math.max(
      1,
      Math.round(
        ((chapterIndex + 1) / chapter.work.chapters.length) * 100,
      ),
    ),
  );
  const completed = progressPercent === 100;
  const now = new Date();

  return prisma.readingProgress.upsert({
    where: {
      userId_workId: {
        userId,
        workId: chapter.work.id,
      },
    },
    create: {
      chapterId: chapter.id,
      completed,
      completedAt: completed ? now : null,
      lastPosition: chapter.position,
      lastReadAt: now,
      progressPercent,
      userId,
      workId: chapter.work.id,
    },
    update: {
      chapterId: chapter.id,
      completed,
      completedAt: completed ? now : null,
      lastPosition: chapter.position,
      lastReadAt: now,
      progressPercent,
    },
  });
}

export async function getReadingProgress(userId: string, workId: string) {
  return prisma.readingProgress.findUnique({
    where: {
      userId_workId: {
        userId,
        workId,
      },
    },
    select: {
      chapterId: true,
      lastPosition: true,
      progressPercent: true,
    },
  });
}

export async function getContinueReading(userId: string) {
  return prisma.readingProgress.findMany({
    where: {
      userId,
      chapter: {
        is: {
          archivedAt: null,
          publishedAt: {
            not: null,
          },
          status: "published",
        },
      },
      work: {
        is: publicWorkWhere,
      },
    },
    orderBy: {
      lastReadAt: "desc",
    },
    select: {
      chapter: {
        select: {
          position: true,
          title: true,
        },
      },
      progressPercent: true,
      work: {
        select: {
          author: {
            select: {
              displayName: true,
              fullName: true,
            },
          },
          chapters: {
            where: {
              archivedAt: null,
              publishedAt: {
                not: null,
              },
              status: "published",
            },
            select: {
              id: true,
              publishedAt: true,
              status: true,
            },
          },
          editorReviewStatus: true,
          genre: true,
          id: true,
          slug: true,
          title: true,
        },
      },
    },
    take: 6,
  });
}
