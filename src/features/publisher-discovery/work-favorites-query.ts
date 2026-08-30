import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import { countWords } from "@/features/editor-workspace/eligibility";
import { hasDiscoveryAdvancedFilters, type DiscoveryCompletionStatus } from "@/lib/discovery-advanced-filters";
import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-list-standard";
import { prisma } from "@/lib/prisma";
import type { StoredWorkContentRating } from "@/lib/work-content-classification";
import {
  matchesPublisherCollectionWorkFilters,
  normalizePublisherFavoriteFilters,
  type PublisherFavoriteFilters,
} from "./favorites-query";

export { normalizePublisherFavoriteFilters };
export type { PublisherFavoriteFilters };

export interface PublisherFavoriteWorkRow {
  authorAlias: string;
  authorName: string;
  chapterCount: number;
  commentCount: number;
  completion: DiscoveryCompletionStatus;
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
  totalWords: number;
  updatedAt: string;
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

const favoriteWorkSelect = {
  createdAt: true,
  id: true,
  work: {
    select: {
      _count: {
        select: {
          comments: {
            where: { deletedAt: null, status: "visible" as const },
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
        where: { archivedAt: null },
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
      editorReviewStatus: true,
      genre: true,
      id: true,
      language: true,
      publishedAt: true,
      slug: true,
      subtitle: true,
      title: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.PublisherWorkFavoriteSelect;

type FavoriteRecord = Prisma.PublisherWorkFavoriteGetPayload<{
  select: typeof favoriteWorkSelect;
}>;

function mapFavoriteWork(record: FavoriteRecord): PublisherFavoriteWorkRow {
  const publishedChapters = record.work.chapters.filter(
    (chapter) =>
      chapter.status === "published" && chapter.publishedAt !== null,
  );
  const hasPendingChapter = record.work.chapters.some(
    (chapter) =>
      chapter.status !== "published" || chapter.publishedAt === null,
  );

  return {
    authorAlias: publicWriterAlias(record.work.author),
    authorName: publicWriterName(record.work.author),
    chapterCount: publishedChapters.length,
    commentCount: record.work._count.comments,
    completion:
      publishedChapters.length > 0 && !hasPendingChapter ? "completed" : "ongoing",
    contentRating: record.work.contentRating,
    editorReviewStatus: record.work.editorReviewStatus,
    favoriteCount: record.work._count.favorites,
    favoritedAt: record.createdAt.toISOString(),
    favoriteId: record.id,
    firstChapterPosition: publishedChapters[0]?.position ?? null,
    genre: record.work.genre,
    hasPassportRecord:
      record.work._count.ownershipStamps > 0 || record.work._count.versions > 0,
    id: record.work.id,
    language: record.work.language,
    publishedAt:
      record.work.publishedAt?.toISOString() ?? new Date(0).toISOString(),
    readerCount: record.work._count.readingProgress,
    slug: record.work.slug,
    subtitle: record.work.subtitle,
    title: record.work.title,
    totalWords: publishedChapters.reduce(
      (total, chapter) => total + countWords(chapter.content),
      0,
    ),
    updatedAt: record.work.updatedAt.toISOString(),
    versionCount: record.work._count.versions,
  };
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
  const workWhere: Prisma.WorkWhereInput = {
    ...commonDiscoveryWorkWhereFor(canAccessAdultContent),
    ...(contentRating ? { contentRating } : {}),
    ...(filters.genre ? { genre: filters.genre } : {}),
    ...(filters.language ? { language: filters.language } : {}),
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
  };
  const where: Prisma.PublisherWorkFavoriteWhereInput = {
    publisherId,
    work: workWhere,
  };
  const usesPostFilter =
    Boolean(filters.wordCount) || hasDiscoveryAdvancedFilters(filters.advanced);

  let rows: PublisherFavoriteWorkRow[];
  let totalCount: number;
  let totalPages: number;
  let currentPage: number;

  if (usesPostFilter) {
    const records = await prisma.publisherWorkFavorite.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: favoriteWorkSelect,
    });
    const allRows = records
      .map(mapFavoriteWork)
      .filter((row) => matchesPublisherCollectionWorkFilters(row, filters));
    totalCount = allRows.length;
    totalPages = Math.max(1, Math.ceil(totalCount / DISCOVERY_PAGE_SIZE));
    currentPage = Math.min(filters.page, totalPages);
    rows = allRows.slice(
      (currentPage - 1) * DISCOVERY_PAGE_SIZE,
      currentPage * DISCOVERY_PAGE_SIZE,
    );
  } else {
    totalCount = await prisma.publisherWorkFavorite.count({ where });
    totalPages = Math.max(1, Math.ceil(totalCount / DISCOVERY_PAGE_SIZE));
    currentPage = Math.min(filters.page, totalPages);
    const records = await prisma.publisherWorkFavorite.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * DISCOVERY_PAGE_SIZE,
      take: DISCOVERY_PAGE_SIZE,
      select: favoriteWorkSelect,
    });
    rows = records.map(mapFavoriteWork);
  }

  const first =
    totalCount === 0
      ? 0
      : (currentPage - 1) * DISCOVERY_PAGE_SIZE + 1;
  const last = Math.min(currentPage * DISCOVERY_PAGE_SIZE, totalCount);

  return {
    currentPage,
    first,
    last,
    rows,
    totalCount,
    totalPages,
  };
}
