import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import { countWords } from "@/features/editor-workspace/eligibility";
import {
  hasDiscoveryAdvancedFilters,
  matchesDiscoveryAdvancedWorkFilters,
  parseDiscoveryAdvancedFilters,
  type DiscoveryAdvancedFilters,
  type DiscoveryCompletionStatus,
} from "@/lib/discovery-advanced-filters";
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
const wordCountFilters = ["short", "medium", "long"] as const;

export type PublisherCollectionReviewStatus = (typeof reviewStatuses)[number];
export type PublisherCollectionWordCountFilter = (typeof wordCountFilters)[number];

export interface PublisherFavoriteFilters {
  advanced: DiscoveryAdvancedFilters;
  contentRating?: MemberStoredWorkContentRating;
  genre: string;
  language: string;
  page: number;
  query: string;
  reviewStatus?: PublisherCollectionReviewStatus;
  wordCount?: PublisherCollectionWordCountFilter;
}

export interface PublisherLikedWorkRow {
  authorAlias: string;
  authorName: string;
  chapterCount: number;
  commentCount: number;
  completion: DiscoveryCompletionStatus;
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
  totalWords: number;
  updatedAt: string;
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

function isWordCountFilter(value: string): value is PublisherCollectionWordCountFilter {
  return wordCountFilters.includes(value as PublisherCollectionWordCountFilter);
}

export function normalizePublisherFavoriteFilters(
  input: Record<string, string | string[] | undefined>,
): PublisherFavoriteFilters {
  const requestedPage = Number.parseInt(firstValue(input.sayfa), 10);
  const requestedRating = firstValue(input.hitap);
  const requestedReview = firstValue(input.editor);
  const genre = normalizeGenreLabel(firstValue(input.tur));
  const wordCount = firstValue(input.kelime);

  return {
    advanced: parseDiscoveryAdvancedFilters(input),
    contentRating: isMemberStoredWorkContentRating(requestedRating)
      ? requestedRating
      : undefined,
    genre: genre ?? "",
    language: firstValue(input.dil).slice(0, 10),
    page:
      Number.isFinite(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1,
    query: firstValue(input.arama).slice(0, 220),
    reviewStatus: isReviewStatus(requestedReview) ? requestedReview : undefined,
    wordCount: isWordCountFilter(wordCount) ? wordCount : undefined,
  };
}

export function publisherCollectionWordCountLabel(
  value: PublisherCollectionWordCountFilter,
) {
  if (value === "short") return "30.000 altı";
  if (value === "medium") return "30.000 – 80.000";
  return "80.000 üzeri";
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

const likedWorkSelect = {
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
} satisfies Prisma.PublisherWorkLikeSelect;

type LikedRecord = Prisma.PublisherWorkLikeGetPayload<{
  select: typeof likedWorkSelect;
}>;

function mapLikedWork(record: LikedRecord): PublisherLikedWorkRow {
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
    firstChapterPosition: publishedChapters[0]?.position ?? null,
    genre: record.work.genre,
    hasPassportRecord:
      record.work._count.ownershipStamps > 0 || record.work._count.versions > 0,
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
    totalWords: publishedChapters.reduce(
      (total, chapter) => total + countWords(chapter.content),
      0,
    ),
    updatedAt: record.work.updatedAt.toISOString(),
    versionCount: record.work._count.versions,
  };
}

function matchesWordCount(total: number, filter?: PublisherCollectionWordCountFilter) {
  if (filter === "short") return total < 30_000;
  if (filter === "medium") return total >= 30_000 && total <= 80_000;
  if (filter === "long") return total > 80_000;
  return true;
}

export function matchesPublisherCollectionWorkFilters(
  row: {
    authorAlias: string;
    authorName: string;
    chapterCount: number;
    commentCount: number;
    completion: DiscoveryCompletionStatus;
    favoriteCount: number;
    hasPassportRecord: boolean;
    publishedAt: string;
    readerCount: number;
    totalWords: number;
    updatedAt: string;
    versionCount: number;
  },
  filters: PublisherFavoriteFilters,
) {
  if (!matchesWordCount(row.totalWords, filters.wordCount)) return false;

  return matchesDiscoveryAdvancedWorkFilters(
    {
      authorName: row.authorName,
      authorUsername: row.authorAlias,
      chapterCount: row.chapterCount,
      commentCount: row.commentCount,
      completionStatus: row.completion,
      favoriteCount: row.favoriteCount,
      hasPassport: row.hasPassportRecord,
      publishedAt: row.publishedAt,
      readerCount: row.readerCount,
      updatedAt: row.updatedAt,
      versionCount: row.versionCount,
    },
    filters.advanced,
  );
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
  const where: Prisma.PublisherWorkLikeWhereInput = {
    publisherId,
    work: workWhere,
  };
  const usesPostFilter =
    Boolean(filters.wordCount) || hasDiscoveryAdvancedFilters(filters.advanced);

  let rows: PublisherLikedWorkRow[];
  let totalCount: number;
  let totalPages: number;
  let currentPage: number;

  if (usesPostFilter) {
    const records = await prisma.publisherWorkLike.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: likedWorkSelect,
    });
    const allRows = records
      .map(mapLikedWork)
      .filter((row) => matchesPublisherCollectionWorkFilters(row, filters));
    totalCount = allRows.length;
    totalPages = Math.max(1, Math.ceil(totalCount / DISCOVERY_PAGE_SIZE));
    currentPage = Math.min(filters.page, totalPages);
    rows = allRows.slice(
      (currentPage - 1) * DISCOVERY_PAGE_SIZE,
      currentPage * DISCOVERY_PAGE_SIZE,
    );
  } else {
    totalCount = await prisma.publisherWorkLike.count({ where });
    totalPages = Math.max(1, Math.ceil(totalCount / DISCOVERY_PAGE_SIZE));
    currentPage = Math.min(filters.page, totalPages);
    const records = await prisma.publisherWorkLike.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * DISCOVERY_PAGE_SIZE,
      take: DISCOVERY_PAGE_SIZE,
      select: likedWorkSelect,
    });
    rows = records.map(mapLikedWork);
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
