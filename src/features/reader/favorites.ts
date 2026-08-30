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
  completedAt: Date | null;
  completionStatus: "completed" | "ongoing";
  contentRating: StoredWorkContentRating;
  description: string | null;
  favoriteCount: number;
  hasPassport: boolean;
  lastReadAt: Date | null;
  lastReadLabel: string | null;
  progressPercent: number | null;
  publishedAt: Date | null;
  readerCount: number;
  readingHref: string | null;
  readingState: "unread" | "in_progress" | "completed";
  updatedAt: Date;
  versionCount: number;
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
              ownershipStamps: true,
              readingProgress: true,
              versions: true,
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
              completedAt: true,
              lastReadAt: true,
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
    const publishedChapters = work.chapters.filter(
      (chapter) => chapter.status === "published" && chapter.publishedAt !== null,
    );
    const firstChapter = publishedChapters[0] ?? null;
    const hasPendingChapter = work.chapters.some(
      (chapter) => chapter.status !== "published" || chapter.publishedAt === null,
    );
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
      chapterCount: publishedChapters.length,
      commentCount: work._count.comments,
      completedAt: progress?.completedAt ?? null,
      completionStatus:
        publishedChapters.length > 0 && !hasPendingChapter ? "completed" : "ongoing",
      contentRating: work.contentRating,
      coverUrl: work.coverUrl,
      description: work.description,
      editorReviewStatus: work.editorReviewStatus,
      favoriteCount: work._count.favorites,
      genre: work.genre,
      hasPassport:
        work._count.ownershipStamps > 0 || work._count.versions > 0,
      id: work.id,
      isFavorite: true,
      language: work.language,
      lastReadAt: progress?.lastReadAt ?? null,
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
      totalWords: publishedChapters.reduce(
        (total, chapter) => total + countWords(chapter.content),
        0,
      ),
      updatedAt: work.updatedAt,
      versionCount: work._count.versions,
    };
  });
}
