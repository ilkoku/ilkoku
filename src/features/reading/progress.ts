"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const publicWorkWhere = {
  archivedAt: null,
  publishedAt: {
    not: null,
  },
  status: "published" as const,
  visibility: "public" as const,
};

const readingProgressInputSchema = z.object({
  activeSeconds: z.number().int().min(0).max(3600),
  chapterId: z.string().uuid(),
  chapterProgressPercent: z.number().int().min(0).max(100),
  complete: z.boolean().optional().default(false),
});

async function requireReader() {
  const user = await getCurrentUser();

  if (
    !user ||
    user.status !== "active" ||
    !canAccessReaderWorkspace(user.role)
  ) {
    throw new Error("READER_PERMISSION_REQUIRED");
  }

  return user;
}

export async function recordReadingProgressAction(
  input: unknown,
) {
  const user = await requireReader();
  const parsed = readingProgressInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      completed: false,
      progressPercent: null,
      started: false,
      status: "invalid" as const,
    };
  }

  const {
    activeSeconds,
    chapterId,
    chapterProgressPercent,
    complete,
  } = parsed.data;

  const chapter = await prisma.chapter.findFirst({
    where: {
      archivedAt: null,
      id: chapterId,
      publishedAt: {
        not: null,
      },
      status: "published",
      work: {
        is: publicWorkWhere,
      },
    },
    select: {
      id: true,
      position: true,
      work: {
        select: {
          id: true,
          slug: true,
          chapters: {
            where: {
              archivedAt: null,
              publishedAt: {
                not: null,
              },
              status: "published",
            },
            orderBy: {
              position: "asc",
            },
            select: {
              id: true,
              position: true,
            },
          },
        },
      },
    },
  });

  if (!chapter || chapter.work.chapters.length === 0) {
    return {
      completed: false,
      progressPercent: null,
      started: false,
      status: "unavailable" as const,
    };
  }

  const existing = await prisma.readingProgress.findUnique({
    where: {
      userId_workId: {
        userId: user.id,
        workId: chapter.work.id,
      },
    },
    select: {
      completed: true,
      completedAt: true,
      progressPercent: true,
    },
  });

  const qualifiesAsStarted =
    activeSeconds >= 20 &&
    chapterProgressPercent >= 10;

  if (!existing && !qualifiesAsStarted) {
    return {
      completed: false,
      progressPercent: null,
      started: false,
      status: "waiting" as const,
    };
  }

  if (existing && !qualifiesAsStarted) {
    return {
      completed: existing.completed,
      progressPercent: existing.progressPercent,
      started: true,
      status: "unchanged" as const,
    };
  }

  const chapterIndex = chapter.work.chapters.findIndex(
    (item) => item.id === chapter.id,
  );

  if (chapterIndex < 0) {
    return {
      completed: false,
      progressPercent: null,
      started: false,
      status: "unavailable" as const,
    };
  }

  const isLastChapter =
    chapterIndex === chapter.work.chapters.length - 1;

  const completedNow =
    complete &&
    isLastChapter &&
    chapterProgressPercent >= 90;

  const calculatedProgress = Math.round(
    (
      (
        chapterIndex +
        chapterProgressPercent / 100
      ) /
      chapter.work.chapters.length
    ) *
      100,
  );

  const completed =
    Boolean(existing?.completed) ||
    completedNow;

  const progressPercent = completed
    ? 100
    : Math.min(
        99,
        Math.max(
          existing?.progressPercent ?? 0,
          Math.max(1, calculatedProgress),
        ),
      );

  const now = new Date();

  const saved = await prisma.readingProgress.upsert({
    where: {
      userId_workId: {
        userId: user.id,
        workId: chapter.work.id,
      },
    },
    create: {
      chapterId: chapter.id,
      completed,
      completedAt: completed ? now : null,
      lastPosition: chapterProgressPercent,
      lastReadAt: now,
      progressPercent,
      userId: user.id,
      workId: chapter.work.id,
    },
    update: {
      chapterId: chapter.id,
      completed,
      completedAt: completed
        ? existing?.completedAt ?? now
        : null,
      lastPosition: chapterProgressPercent,
      lastReadAt: now,
      progressPercent,
    },
    select: {
      completed: true,
      progressPercent: true,
    },
  });

  revalidatePath("/kesfet");
  revalidatePath("/okumaya-devam");
  revalidatePath("/tamamlanan-eserler");
  revalidatePath("/okuyucu");
  revalidatePath(`/kitap/${chapter.work.slug}`);

  return {
    completed: saved.completed,
    progressPercent: saved.progressPercent,
    started: true,
    status: "saved" as const,
  };
}

export async function getReadingProgress(
  userId: string,
  workId: string,
) {
  const progress = await prisma.readingProgress.findUnique({
    where: {
      userId_workId: {
        userId,
        workId,
      },
    },
    select: {
      chapter: {
        select: {
          position: true,
        },
      },
      completed: true,
      lastPosition: true,
      progressPercent: true,
    },
  });

  if (!progress) {
    return null;
  }

  return {
    chapterPosition: progress.chapter.position,
    completed: progress.completed,
    lastPosition: progress.lastPosition,
    progressPercent: progress.progressPercent,
  };
}

export async function getContinueReading(
  userId: string,
  take = 6,
) {
  return prisma.readingProgress.findMany({
    where: {
      completed: false,
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
          _count: {
            select: {
              comments: {
                where: {
                  deletedAt: null,
                  status: "visible",
                },
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
              publishedAt: {
                not: null,
              },
              status: "published",
            },
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
            where: {
              userId,
            },
            select: {
              id: true,
            },
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
    take,
  });
}

export async function getCompletedReading(
  userId: string,
  take = 100,
) {
  return prisma.readingProgress.findMany({
    where: {
      completed: true,
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
      completedAt: "desc",
    },
    select: {
      chapter: {
        select: {
          position: true,
          title: true,
        },
      },
      completedAt: true,
      progressPercent: true,
      work: {
        select: {
          _count: {
            select: {
              comments: {
                where: {
                  deletedAt: null,
                  status: "visible",
                },
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
              publishedAt: {
                not: null,
              },
              status: "published",
            },
            orderBy: {
              position: "asc",
            },
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
            where: {
              userId,
            },
            select: {
              id: true,
            },
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
    take,
  });
}

export async function restartReadingAction(
  formData: FormData,
) {
  const user = await requireReader();

  const workIdResult = z
    .string()
    .uuid()
    .safeParse(formData.get("workId"));

  if (!workIdResult.success) {
    throw new Error("INVALID_WORK_ID");
  }

  const requestedReturnTo =
    formData.get("returnTo");

  const returnTo =
    typeof requestedReturnTo === "string" &&
    requestedReturnTo.startsWith("/") &&
    !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/tamamlanan-eserler";

  const work = await prisma.work.findFirst({
    where: {
      ...publicWorkWhere,
      id: workIdResult.data,
      chapters: {
        some: {
          archivedAt: null,
          publishedAt: {
            not: null,
          },
          status: "published",
        },
      },
    },
    select: {
      id: true,
      slug: true,
      chapters: {
        where: {
          archivedAt: null,
          publishedAt: {
            not: null,
          },
          status: "published",
        },
        orderBy: {
          position: "asc",
        },
        take: 1,
        select: {
          id: true,
          position: true,
        },
      },
    },
  });

  const firstChapter =
    work?.chapters[0] ?? null;

  if (!work || !firstChapter) {
    throw new Error("PUBLIC_WORK_NOT_FOUND");
  }

  const now = new Date();

  await prisma.readingProgress.upsert({
    where: {
      userId_workId: {
        userId: user.id,
        workId: work.id,
      },
    },
    create: {
      chapterId: firstChapter.id,
      completed: false,
      completedAt: null,
      lastPosition: 0,
      lastReadAt: now,
      progressPercent: 0,
      userId: user.id,
      workId: work.id,
    },
    update: {
      chapterId: firstChapter.id,
      completed: false,
      completedAt: null,
      lastPosition: 0,
      lastReadAt: now,
      progressPercent: 0,
    },
  });

  revalidatePath("/kesfet");
  revalidatePath("/okumaya-devam");
  revalidatePath("/tamamlanan-eserler");
  revalidatePath("/favorilerim");
  revalidatePath("/okuyucu");
  revalidatePath(`/kitap/${work.slug}`);

  redirect(
    `/oku/${work.slug}/bolum-${firstChapter.position}?from=${encodeURIComponent(returnTo)}`,
  );
}
