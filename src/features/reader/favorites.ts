"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { countWords } from "@/features/editor-workspace/eligibility";
import type { EditorWorkCardData } from "@/features/editor-workspace/types";
import {
  adultContentWorkVisibility,
  getAdultContentAccess,
} from "@/lib/adult-content-access";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import type { StoredWorkContentRating } from "@/lib/work-content-classification";

const workIdSchema = z.string().uuid();

const returnPathSchema = z
  .string()
  .max(5000)
  .refine(
    (value) => value.startsWith("/") && !value.startsWith("//"),
    "INVALID_RETURN_PATH",
  );

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

async function readerWorkVisibility(userId: string) {
  const access = await getAdultContentAccess(userId);
  return adultContentWorkVisibility(access.canAccessAdultContent);
}

export async function toggleFavoriteAction(formData: FormData): Promise<void> {
  const user = await requireReader();
  const parsedWorkId = workIdSchema.safeParse(formData.get("workId"));
  const rawReturnPath = formData.get("returnPath");

  const parsedReturnPath =
    rawReturnPath === null
      ? null
      : returnPathSchema.safeParse(rawReturnPath);

  if (!parsedWorkId.success) throw new Error("INVALID_WORK_ID");
  if (parsedReturnPath && !parsedReturnPath.success) {
    throw new Error("INVALID_RETURN_PATH");
  }

  const visibility = await readerWorkVisibility(user.id);
  const work = await prisma.work.findFirst({
    where: {
      archivedAt: null,
      ...visibility,
      id: parsedWorkId.data,
      publishedAt: { not: null },
      status: "published",
      visibility: "public",
    },
    select: { id: true, slug: true },
  });

  if (!work) throw new Error("WORK_NOT_AVAILABLE");

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_workId: {
        userId: user.id,
        workId: work.id,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({
      data: { userId: user.id, workId: work.id },
    });
  }

  revalidatePath("/favorilerim");
  revalidatePath("/kesfet");
  revalidatePath("/okumaya-devam");
  revalidatePath("/tamamlanan-eserler");
  revalidatePath("/okuyucu");
  revalidatePath(`/kitap/${work.slug}`);

  if (parsedReturnPath?.success) revalidatePath(parsedReturnPath.data);
}

export async function getFavoriteStatus(userId: string, workId: string) {
  const favorite = await prisma.favorite.findUnique({
    where: { userId_workId: { userId, workId } },
    select: { id: true },
  });

  return Boolean(favorite);
}

export type ReaderFavoriteWork = EditorWorkCardData & {
  authorUsername: string | null;
  commentCount: number;
  contentRating: StoredWorkContentRating;
  description: string | null;
  favoriteCount: number;
  lastReadLabel: string | null;
  progressPercent: number | null;
  publishedAt: Date | null;
  readerCount: number;
  readingHref: string | null;
  readingState: "unread" | "in_progress" | "completed";
  updatedAt: Date;
};

export async function getFavoriteWorks(
  userId: string,
): Promise<ReaderFavoriteWork[]> {
  const visibility = await readerWorkVisibility(userId);
  const favorites = await prisma.favorite.findMany({
    where: {
      userId,
      work: {
        is: {
          archivedAt: null,
          ...visibility,
          publishedAt: { not: null },
          status: "published",
          visibility: "public",
        },
      },
    },
    include: {
      work: {
        include: {
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
            select: { content: true, id: true, position: true },
          },
          readingProgress: {
            where: {
              userId,
              chapter: {
                is: {
                  archivedAt: null,
                  publishedAt: { not: null },
                  status: "published",
                },
              },
            },
            orderBy: { lastReadAt: "desc" },
            select: {
              chapter: {
                select: { position: true, title: true },
              },
              completed: true,
              progressPercent: true,
            },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return favorites.map(({ work }) => {
    const progress = work.readingProgress[0] ?? null;
    const firstChapter = work.chapters[0] ?? null;
    const readingState = progress?.completed
      ? "completed"
      : progress
        ? "in_progress"
        : "unread";
    const targetPosition =
      readingState === "completed"
        ? firstChapter?.position
        : progress?.chapter.position ?? firstChapter?.position;

    return {
      assignedEditorId: work.assignedEditorId,
      authorName: work.author.displayName ?? work.author.fullName,
      authorUsername: work.author.username,
      chapterCount: work.chapters.length,
      commentCount: work._count.comments,
      contentRating: work.contentRating,
      coverUrl: work.coverUrl,
      description: work.description,
      editorReviewStatus: work.editorReviewStatus,
      favoriteCount: work._count.favorites,
      genre: work.genre,
      id: work.id,
      isFavorite: true,
      language: work.language,
      lastReadLabel: progress?.chapter.title ?? null,
      progressPercent: progress?.progressPercent ?? null,
      publishedAt: work.publishedAt,
      readerCount: work._count.readingProgress,
      readingHref:
        typeof targetPosition === "number"
          ? `/oku/${work.slug}/bolum-${targetPosition}`
          : null,
      readingState,
      slug: work.slug,
      title: work.title,
      totalWords: work.chapters.reduce(
        (total, chapter) => total + countWords(chapter.content),
        0,
      ),
      updatedAt: work.updatedAt,
    };
  });
}
