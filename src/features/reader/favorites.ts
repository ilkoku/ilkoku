"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { countWords } from "@/features/editor-workspace/eligibility";
import type { EditorWorkCardData } from "@/features/editor-workspace/types";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const workIdSchema = z.string().uuid();

async function requireReader() {
  const user = await getCurrentUser();

  if (
    !user ||
    !canAccessReaderWorkspace(user.role) ||
    user.status !== "active"
  ) {
    throw new Error("READER_PERMISSION_REQUIRED");
  }

  return user;
}

export async function toggleFavoriteAction(formData: FormData): Promise<void> {
  const user = await requireReader();
  const parsedWorkId = workIdSchema.safeParse(formData.get("workId"));

  if (!parsedWorkId.success) {
    throw new Error("INVALID_WORK_ID");
  }

  const work = await prisma.work.findFirst({
    where: {
      archivedAt: null,
      id: parsedWorkId.data,
      publishedAt: {
        not: null,
      },
      status: "published",
      visibility: "public",
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!work) {
    throw new Error("WORK_NOT_AVAILABLE");
  }

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_workId: {
        userId: user.id,
        workId: work.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    await prisma.favorite.delete({
      where: {
        id: existing.id,
      },
    });
  } else {
    await prisma.favorite.create({
      data: {
        userId: user.id,
        workId: work.id,
      },
    });
  }

  revalidatePath("/favorilerim");
  revalidatePath("/kesfet");
  revalidatePath("/okuyucu");
  revalidatePath(`/kitap/${work.slug}`);
}

export async function getFavoriteStatus(userId: string, workId: string) {
  const favorite = await prisma.favorite.findUnique({
    where: {
      userId_workId: {
        userId,
        workId,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(favorite);
}

export async function getFavoriteWorks(
  userId: string,
): Promise<EditorWorkCardData[]> {
  const favorites = await prisma.favorite.findMany({
    where: {
      userId,
      work: {
        is: {
          archivedAt: null,
          publishedAt: {
            not: null,
          },
          status: "published",
          visibility: "public",
        },
      },
    },
    include: {
      work: {
        include: {
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
              content: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return favorites.map(({ work }) => ({
    assignedEditorId: work.assignedEditorId,
    authorName: work.author.displayName ?? work.author.fullName,
    chapterCount: work.chapters.length,
    coverUrl: work.coverUrl,
    editorReviewStatus: work.editorReviewStatus,
    genre: work.genre,
    id: work.id,
    isFavorite: true,
    language: work.language,
    slug: work.slug,
    title: work.title,
    totalWords: work.chapters.reduce(
      (total, chapter) => total + countWords(chapter.content),
      0,
    ),
  }));
}
