import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-list-standard";
import { normalizeGenreLabel } from "@/lib/genre-system";
import { prisma } from "@/lib/prisma";
import {
  isMemberStoredWorkContentRating,
  type MemberStoredWorkContentRating,
  type StoredWorkContentRating,
} from "@/lib/work-content-classification";

const reviewStatuses = [
  "not_requested",
  "requested",
  "in_progress",
  "awaiting_second_editor",
  "second_in_progress",
  "completed",
] as const;

export type PublisherCollectionReviewStatus = (typeof reviewStatuses)[number];

export interface PublisherFavoriteFilters {
  contentRating?: MemberStoredWorkContentRating;
  genre: string;
  page: number;
  query: string;
  reviewStatus?: PublisherCollectionReviewStatus;
}

export interface PublisherLikedWorkRow {
  authorAlias: string;
  authorName: string;
  chapterCount: number;
  commentCount: number;
  contentRating: StoredWorkContentRating;
  editorReviewStatus: string;
  favoriteCount: number;
  firstChapterPosition: number | null;
  genre: string | null;
  hasPassportRecord: boolean;
  id: string;
  language: string;
  likedAt: string;
  likeId: string;
  publishedAt: string;
  readerCount: number;
  slug: string;
  subtitle: string | null;
  title: string;
  versionCount: number;
}

export interface PublisherLikedWorkData {
  currentPage: number;
  first: number;
  last: number;
  rows: PublisherLikedWorkRow[];
  totalCount: number;
  totalPages: number;
}

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function isReviewStatus(value: string): value is PublisherCollectionReviewStatus {
  return reviewStatuses.includes(value as PublisherCollectionReviewStatus);
}

export function normalizePublisherFavoriteFilters(
  input: Record<string, string | string[] | undefined>,
): PublisherFavoriteFilters {
  const requestedPage = Number.parseInt(firstValue(input.sayfa), 10);
  const requestedRating = firstValue(input.hitap);
  const requestedReview = firstValue(input.editor);
  const genre = normalizeGenreLabel(firstValue(input.tur));

  return {
    contentRating: isMemberStoredWorkContentRating(requestedRating)
      ? requestedRating
      : undefined,
    genre: genre ?? "",
    page:
      Number.isFinite(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1,
    query: firstValue(input.arama).slice(0, 220),
    reviewStatus: isReviewStatus(requestedReview) ? requestedReview : undefined,
  };
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

export async function getPublisherLikedWorks(
  publisherId: string,
  filters: PublisherFavoriteFilters,
  canAccessAdultContent = false,
): Promise<PublisherLikedWorkData> {
  const contentRating =
    filters.contentRating === "adult_18" && !canAccessAdultContent
      ? undefined
      : filters.contentRating;
  const where: Prisma.PublisherWorkLikeWhereInput = {
    publisherId,
    work: {
      ...commonDiscoveryWorkWhereFor(canAccessAdultContent),
      ...(contentRating ? { contentRating } : {}),
      ...(filters.genre ? { genre: filters.genre } : {}),
      ...(filters.reviewStatus
        ? { editorReviewStatus: filters.reviewStatus }
        : {}),
      ...(filters.query
        ? {
            OR: [
              { title: { contains: filters.query } },
              { subtitle: { contains: filters.query } },
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

  const totalCount = await prisma.publisherWorkLike.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / DISCOVERY_PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);

  const records = await prisma.publisherWorkLike.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * DISCOVERY_PAGE_SIZE,
    take: DISCOVERY_PAGE_SIZE,
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

  const first =
    totalCount === 0
      ? 0
      : (currentPage - 1) * DISCOVERY_PAGE_SIZE + 1;
  const last = Math.min(currentPage * DISCOVERY_PAGE_SIZE, totalCount);

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
      firstChapterPosition: record.work.chapters[0]?.position ?? null,
      genre: record.work.genre,
      hasPassportRecord:
        record.work._count.ownershipStamps > 0 ||
        record.work._count.versions > 0,
      id: record.work.id,
      language: record.work.language,
      likedAt: record.createdAt.toISOString(),
      likeId: record.id,
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
