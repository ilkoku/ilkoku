import type { Prisma } from "@/generated/prisma/client";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import { countWords } from "@/features/editor-workspace/eligibility";
import {
  hasDiscoveryAdvancedFilters,
  matchesDiscoveryAdvancedWorkFilters,
  parseDiscoveryAdvancedFilters,
  type DiscoveryAdvancedFilters,
} from "@/lib/discovery-advanced-filters";
import { normalizeGenreLabel } from "@/lib/genre-system";
import { prisma } from "@/lib/prisma";
import {
  isMemberStoredWorkContentRating,
  type MemberStoredWorkContentRating,
  type StoredWorkContentRating,
} from "@/lib/work-content-classification";

export const PUBLISHER_WORK_PAGE_SIZE = 24;

const reviewStatuses = [
  "not_requested",
  "requested",
  "in_progress",
  "awaiting_second_editor",
  "second_in_progress",
  "completed",
] as const;
const wordCountFilters = ["short", "medium", "long"] as const;

type ReviewStatus = (typeof reviewStatuses)[number];
export type PublisherWordCountFilter = (typeof wordCountFilters)[number];

export interface PublisherWorkDiscoveryFilters {
  advanced: DiscoveryAdvancedFilters;
  contentRating: MemberStoredWorkContentRating | "";
  genre: string;
  language: string;
  page: number;
  query: string;
  reviewStatus: ReviewStatus | "";
  sort: "newest" | "updated";
  wordCount?: PublisherWordCountFilter;
}

export interface PublisherWorkDiscoveryRow {
  authorAlias: string;
  authorName: string;
  chapterCount: number;
  commentCount: number;
  completion: "completed" | "ongoing";
  contentRating: StoredWorkContentRating;
  coverUrl: string | null;
  editorReviewStatus: ReviewStatus;
  favoriteCount: number;
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

export interface PublisherWorkDiscoveryData {
  currentPage: number;
  first: number;
  last: number;
  rows: PublisherWorkDiscoveryRow[];
  totalCount: number;
  totalPages: number;
}

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function isReviewStatus(value: string): value is ReviewStatus {
  return reviewStatuses.includes(value as ReviewStatus);
}

function isWordCountFilter(value: string): value is PublisherWordCountFilter {
  return wordCountFilters.includes(value as PublisherWordCountFilter);
}

export function publisherWordCountLabel(value: PublisherWordCountFilter) {
  if (value === "short") return "30.000 altı";
  if (value === "medium") return "30.000 – 80.000";
  return "80.000 üzeri";
}

export function normalizePublisherWorkDiscoveryFilters(
  input: Record<string, string | string[] | undefined>,
): PublisherWorkDiscoveryFilters {
  const rawPage = Number.parseInt(firstValue(input.sayfa), 10);
  const contentRating = firstValue(input.hitap);
  const reviewStatus = firstValue(input.editor);
  const sort = firstValue(input.siralama);
  const genre = normalizeGenreLabel(firstValue(input.tur));
  const wordCount = firstValue(input.kelime);

  return {
    advanced: parseDiscoveryAdvancedFilters(input),
    contentRating: isMemberStoredWorkContentRating(contentRating)
      ? contentRating
      : "",
    genre: genre ?? "",
    language: firstValue(input.dil).slice(0, 10),
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
    query: firstValue(input.arama).slice(0, 220),
    reviewStatus: isReviewStatus(reviewStatus) ? reviewStatus : "",
    sort: sort === "updated" ? "updated" : "newest",
    wordCount: isWordCountFilter(wordCount) ? wordCount : undefined,
  };
}

function publicWriterName(writer: {
  displayName: string | null;
  username: string | null;
}) {
  return (
    writer.displayName?.trim() ||
    writer.username?.trim() ||
    "İlkOku Yazarı"
  );
}

function publicWriterAlias(writer: {
  displayName: string | null;
  username: string | null;
}) {
  if (writer.username?.trim()) return `@${writer.username.trim()}`;

  const slug = (writer.displayName?.trim() || "ilkoku-yazari")
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/gu, "-")
    .replace(/[^a-z0-9çğıöşü_-]/giu, "");

  return `@${slug || "ilkoku-yazari"}`;
}

function matchesWordCount(total: number, filter?: PublisherWordCountFilter) {
  if (filter === "short") return total < 30_000;
  if (filter === "medium") return total >= 30_000 && total <= 80_000;
  if (filter === "long") return total > 80_000;
  return true;
}

const workSelect = {
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
    select: { displayName: true, username: true },
  },
  chapters: {
    where: { archivedAt: null },
    orderBy: { position: "asc" as const },
    select: { content: true, id: true, publishedAt: true, status: true },
  },
  contentRating: true,
  coverUrl: true,
  editorReviewStatus: true,
  genre: true,
  id: true,
  language: true,
  publishedAt: true,
  slug: true,
  subtitle: true,
  title: true,
  updatedAt: true,
} satisfies Prisma.WorkSelect;

type SelectedWork = Prisma.WorkGetPayload<{ select: typeof workSelect }>;

function mapWork(work: SelectedWork): PublisherWorkDiscoveryRow {
  const publishedChapterCount = work.chapters.filter(
    (chapter) =>
      chapter.status === "published" && chapter.publishedAt !== null,
  ).length;
  const hasPendingChapter = work.chapters.some(
    (chapter) =>
      chapter.status !== "published" || chapter.publishedAt === null,
  );

  return {
    authorAlias: publicWriterAlias(work.author),
    authorName: publicWriterName(work.author),
    chapterCount: publishedChapterCount,
    commentCount: work._count.comments,
    completion:
      publishedChapterCount > 0 && !hasPendingChapter ? "completed" : "ongoing",
    contentRating: work.contentRating,
    coverUrl: work.coverUrl,
    editorReviewStatus: work.editorReviewStatus,
    favoriteCount: work._count.favorites,
    genre: work.genre,
    hasPassportRecord:
      work._count.ownershipStamps > 0 || work._count.versions > 0,
    id: work.id,
    language: work.language,
    publishedAt:
      work.publishedAt?.toISOString() ?? new Date(0).toISOString(),
    readerCount: work._count.readingProgress,
    slug: work.slug,
    subtitle: work.subtitle,
    title: work.title,
    totalWords: work.chapters
      .filter(
        (chapter) =>
          chapter.status === "published" && chapter.publishedAt !== null,
      )
      .reduce((total, chapter) => total + countWords(chapter.content), 0),
    updatedAt: work.updatedAt.toISOString(),
    versionCount: work._count.versions,
  };
}

function matchesAdvancedWork(
  row: PublisherWorkDiscoveryRow,
  filters: PublisherWorkDiscoveryFilters,
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

export async function getPublisherWorkDiscovery(
  filters: PublisherWorkDiscoveryFilters,
  canAccessAdultContent = false,
): Promise<PublisherWorkDiscoveryData> {
  const contentRating =
    filters.contentRating === "adult_18" && !canAccessAdultContent
      ? ""
      : filters.contentRating;

  const where: Prisma.WorkWhereInput = {
    ...commonDiscoveryWorkWhereFor(canAccessAdultContent),
    ...(contentRating ? { contentRating } : {}),
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
                  ],
                },
              },
            },
          ],
        }
      : {}),
    ...(filters.genre ? { genre: filters.genre } : {}),
    ...(filters.language ? { language: filters.language } : {}),
    ...(filters.reviewStatus
      ? { editorReviewStatus: filters.reviewStatus }
      : {}),
  };
  const orderBy: Prisma.WorkOrderByWithRelationInput[] =
    filters.sort === "updated"
      ? [{ updatedAt: "desc" }, { publishedAt: "desc" }]
      : [{ publishedAt: "desc" }, { createdAt: "desc" }];
  const usesPostFilter =
    Boolean(filters.wordCount) || hasDiscoveryAdvancedFilters(filters.advanced);

  let rows: PublisherWorkDiscoveryRow[];
  let totalCount: number;
  let currentPage: number;
  let totalPages: number;

  if (usesPostFilter) {
    const works = await prisma.work.findMany({
      where,
      orderBy,
      select: workSelect,
    });
    const allRows = works.map(mapWork).filter((row) => matchesAdvancedWork(row, filters));
    totalCount = allRows.length;
    totalPages = Math.max(1, Math.ceil(totalCount / PUBLISHER_WORK_PAGE_SIZE));
    currentPage = Math.min(filters.page, totalPages);
    rows = allRows.slice(
      (currentPage - 1) * PUBLISHER_WORK_PAGE_SIZE,
      currentPage * PUBLISHER_WORK_PAGE_SIZE,
    );
  } else {
    totalCount = await prisma.work.count({ where });
    totalPages = Math.max(1, Math.ceil(totalCount / PUBLISHER_WORK_PAGE_SIZE));
    currentPage = Math.min(filters.page, totalPages);
    const works = await prisma.work.findMany({
      where,
      orderBy,
      skip: (currentPage - 1) * PUBLISHER_WORK_PAGE_SIZE,
      take: PUBLISHER_WORK_PAGE_SIZE,
      select: workSelect,
    });
    rows = works.map(mapWork);
  }

  const first =
    totalCount === 0
      ? 0
      : (currentPage - 1) * PUBLISHER_WORK_PAGE_SIZE + 1;
  const last = Math.min(currentPage * PUBLISHER_WORK_PAGE_SIZE, totalCount);

  return {
    currentPage,
    first,
    last,
    rows,
    totalCount,
    totalPages,
  };
}
