import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { adultContentWorkVisibility } from "@/lib/adult-content-access";
import { prisma } from "@/lib/prisma";
import type { StoredWorkContentRating } from "@/lib/work-content-classification";
import {
  normalizePublisherFavoriteFilters,
  type PublisherFavoriteFilters,
} from "./favorites-query";

export { normalizePublisherFavoriteFilters };
export type { PublisherFavoriteFilters };

const PAGE_SIZE = 20;

export interface PublisherFavoriteWorkRow {
  authorAlias: string;
  authorName: string;
  chapterCount: number;
  commentCount: number;
  contentRating: StoredWorkContentRating;
  editorReviewStatus: string;
  favoriteCount: number;
  favoritedAt: string;
  favoriteId: string;
  firstChapterPosition: number | null;
  genre: string | null;
  hasPassportRecord: boolean;
  id: string;
  language: string;
  publishedAt: string;
  readerCount: number;
  slug: string;
  subtitle: string | null;
  title: string;
  versionCount: number;
}

export interface PublisherFavoriteWorkData {
  currentPage: number;
  first: number;
  last: number;
  rows: PublisherFavoriteWorkRow[];
  totalCount: number;
  totalPages: number;
}

function publicWriterName(writer: {
  displayName: string | null;
  publicId: string;
  username: string | null;
}) {
  return writer.displayName?.trim() || writer.username?.trim() || writer.publicId;
}

function publicWriterAlias(writer: {
  publicId: string;
  username: string | null;
}) {
  const username = writer.username?.trim();
  if (username) return username.startsWith("@") ? username : `@${username}`;
  return `@${writer.publicId.toLocaleLowerCase("tr-TR")}`;
}

function publicWorkWhere(canAccessAdultContent: boolean) {
  return {
    archivedAt: null,
    ...adultContentWorkVisibility(canAccessAdultContent),
    publishedAt: { not: null },
    status: "published",
    visibility: "public",
  } satisfies Prisma.WorkWhereInput;
}

export async function getPublisherFavoriteWorks(
  publisherId: string,
  filters: PublisherFavoriteFilters,
  canAccessAdultContent = false,
): Promise<PublisherFavoriteWorkData> {
  const contentRating =
    filters.contentRating === "adult_18" && !canAccessAdultContent
      ? undefined
      : filters.contentRating;
  const where: Prisma.PublisherWorkFavoriteWhereInput = {
    publisherId,
    work: {
      ...publicWorkWhere(canAccessAdultContent),
      author: {
        is: {
          deletedAt: null,
          role: "writer",
          status: "active",
        },
      },
      ...(contentRating ? { contentRating } : {}),
      ...(filters.query
        ? {
            OR: [
              { title: { contains: filters.query } },
              { subtitle: { contains: filters.query } },
              { genre: { contains: filters.query } },
              {
                author: {
                  is: {
                    OR: [
                      { displayName: { contains: filters.query } },
                      { username: { contains: filters.query } },
                      { publicId: { contains: filters.query } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
  };

  const totalCount = await prisma.publisherWorkFavorite.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);

  const records = await prisma.publisherWorkFavorite.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      createdAt: true,
      id: true,
      work: {
        select: {
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
            select: { displayName: true, publicId: true, username: true },
          },
          chapters: {
            where: {
              archivedAt: null,
              publishedAt: { not: null },
              status: "published",
            },
            orderBy: { position: "asc" },
            select: { id: true, position: true },
          },
          contentRating: true,
          editorReviewStatus: true,
          genre: true,
          id: true,
          language: true,
          publishedAt: true,
          slug: true,
          subtitle: true,
          title: true,
        },
      },
    },
  });

  const first = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const last = Math.min(currentPage * PAGE_SIZE, totalCount);

  return {
    currentPage,
    first,
    last,
    rows: records.map((record) => ({
      authorAlias: publicWriterAlias(record.work.author),
      authorName: publicWriterName(record.work.author),
      chapterCount: record.work.chapters.length,
      commentCount: record.work._count.comments,
      contentRating: record.work.contentRating,
      editorReviewStatus: record.work.editorReviewStatus,
      favoriteCount: record.work._count.favorites,
      favoritedAt: record.createdAt.toISOString(),
      favoriteId: record.id,
      firstChapterPosition: record.work.chapters[0]?.position ?? null,
      genre: record.work.genre,
      hasPassportRecord:
        record.work._count.ownershipStamps > 0 ||
        record.work._count.versions > 0,
      id: record.work.id,
      language: record.work.language,
      publishedAt:
        record.work.publishedAt?.toISOString() ?? new Date(0).toISOString(),
      readerCount: record.work._count.readingProgress,
      slug: record.work.slug,
      subtitle: record.work.subtitle,
      title: record.work.title,
      versionCount: record.work._count.versions,
    })),
    totalCount,
    totalPages,
  };
}
