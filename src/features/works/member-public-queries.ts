import "server-only";

import type {
  PublicChapterDetail,
  PublicWorkDetail,
  PublicWorkSummary,
} from "./types";
import { prisma } from "@/lib/prisma";
import { BLOCKED_PUBLIC_WORK_SLUGS } from "@/lib/public-content-safety";
import {
  adultContentWorkVisibility,
  getAdultContentAccess,
} from "@/lib/adult-content-access";

function memberPublicWhere(canAccessAdultContent: boolean) {
  return {
    archivedAt: null,
    ...adultContentWorkVisibility(canAccessAdultContent),
    author: {
      is: {
        deletedAt: null,
        status: "active" as const,
      },
    },
    language: "tr",
    publishedAt: { not: null },
    slug: { notIn: [...BLOCKED_PUBLIC_WORK_SLUGS] },
    status: "published" as const,
    visibility: "public" as const,
  };
}

async function canAccessAdult(userId: string | null | undefined) {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === "admin") return true;
  const access = await getAdultContentAccess(userId);
  return access.canAccessAdultContent;
}

export async function getPublicWorkAgeRating(slug: string) {
  return prisma.work.findFirst({
    where: {
      archivedAt: null,
      author: {
        is: { deletedAt: null, status: "active" },
      },
      publishedAt: { not: null },
      slug,
      status: "published",
      visibility: "public",
    },
    select: {
      contentRating: true,
      id: true,
      slug: true,
    },
  });
}

export async function getMemberPublicWorkBySlug(
  slug: string,
  userId?: string | null,
): Promise<PublicWorkDetail | null> {
  const canAccessAdultContent = await canAccessAdult(userId);
  const scope = memberPublicWhere(canAccessAdultContent);

  const work = await prisma.work.findFirst({
    where: { ...scope, slug },
    include: {
      _count: {
        select: {
          chapters: { where: { archivedAt: null } },
        },
      },
      author: {
        select: {
          avatarUrl: true,
          displayName: true,
          fullName: true,
          id: true,
          publicId: true,
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
      },
    },
  });

  if (!work) return null;

  const relatedSelect = {
    _count: {
      select: {
        chapters: {
          where: {
            archivedAt: null,
            publishedAt: { not: null },
            status: "published" as const,
          },
        },
      },
    },
    author: {
      select: {
        displayName: true,
        fullName: true,
      },
    },
    editorReviewStatus: true,
    genre: true,
    id: true,
    slug: true,
    title: true,
  } as const;

  const [sameAuthor, similar] = await Promise.all([
    prisma.work.findMany({
      where: {
        ...scope,
        authorId: work.authorId,
        id: { not: work.id },
      },
      orderBy: { createdAt: "desc" },
      select: relatedSelect,
      take: 3,
    }),
    work.genre
      ? prisma.work.findMany({
          where: {
            ...scope,
            authorId: { not: work.authorId },
            genre: work.genre,
            id: { not: work.id },
          },
          orderBy: { createdAt: "desc" },
          select: relatedSelect,
          take: 3,
        })
      : Promise.resolve([]),
  ]);

  function mapRelated(related: (typeof sameAuthor)[number]): PublicWorkSummary {
    return {
      authorName: related.author.displayName ?? related.author.fullName,
      chapterCount: related._count.chapters,
      editorReviewStatus: related.editorReviewStatus,
      genre: related.genre,
      id: related.id,
      slug: related.slug,
      title: related.title,
    };
  }

  return {
    ...work,
    authorName: work.author.displayName ?? work.author.fullName,
    authorPublicId: work.author.publicId,
    chapterCount: work.chapters.length,
    isCompleted:
      work.chapters.length > 0 &&
      work._count.chapters === work.chapters.length,
    sameAuthorWorks: sameAuthor.map(mapRelated),
    similarWorks: similar.map(mapRelated),
  };
}

export async function getMemberPublicChapter(
  workSlug: string,
  chapterNumber: string,
  userId: string,
): Promise<PublicChapterDetail | null> {
  const work = await getMemberPublicWorkBySlug(workSlug, userId);
  if (!work) return null;

  const normalizedChapterNumber = chapterNumber.replace(/^bolum-/u, "");
  const position = Number(normalizedChapterNumber);
  if (!Number.isInteger(position) || position < 1) return null;

  const chapter = await prisma.chapter.findFirst({
    where: {
      archivedAt: null,
      publishedAt: { not: null },
      position,
      status: "published",
      workId: work.id,
    },
  });
  if (!chapter) return null;

  return { ...chapter, work };
}
