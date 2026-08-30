import type { Prisma } from "@/generated/prisma/client";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
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

type ReviewStatus = (typeof reviewStatuses)[number];

export interface PublisherWorkDiscoveryFilters {
  contentRating: MemberStoredWorkContentRating | "";
  genre: string;
  language: string;
  page: number;
  query: string;
  reviewStatus: ReviewStatus | "";
  sort: "newest" | "updated";
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

export function normalizePublisherWorkDiscoveryFilters(
  input: Record<string, string | string[] | undefined>,
): PublisherWorkDiscoveryFilters {
  const rawPage = Number.parseInt(firstValue(input.sayfa), 10);
  const contentRating = firstValue(input.hitap);
  const reviewStatus = firstValue(input.editor);
  const sort = firstValue(input.siralama);
  const genre = normalizeGenreLabel(firstValue(input.tur));

  return {
    contentRating: isMemberStoredWorkContentRating(contentRating)
      ? contentRating
      : "",
    genre: genre ?? "",
    language: firstValue(input.dil).slice(0, 10),
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
    query: firstValue(input.arama).slice(0, 220),
    reviewStatus: isReviewStatus(reviewStatus) ? reviewStatus : "",
    sort: sort === "updated" ? "updated" : "newest",
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
                    { fullName: { contains: filters.query } },
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

  const totalCount = await prisma.work.count({ where });
  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PUBLISHER_WORK_PAGE_SIZE),
  );
  const currentPage = Math.min(filters.page, totalPages);

  const works = await prisma.work.findMany({
    where,
    include: {
      _count: {
        select: {
          comments: {
            where: { deletedAt: null, status: "visible" },
          },
          favorites: true,
          readingProgress: true,
          versions: true,
        },
      },
      author: {
        select: {
          displayName: true,
          username: true,
        },
      },
      chapters: {
        where: {
          archivedAt: null,
          publishedAt: { not: null },
          status: "published",
        },
        select: { id: true },
      },
      passportRecord: {
        select: { id: true },
      },
    },
    orderBy:
      filters.sort === "updated"
        ? [{ updatedAt: "desc" }, { publishedAt: "desc" }]
        : [{ publishedAt: "desc" }, { createdAt: "desc" }],
    skip: (currentPage - 1) * PUBLISHER_WORK_PAGE_SIZE,
    take: PUBLISHER_WORK_PAGE_SIZE,
  });

  const rows = works.map((work): PublisherWorkDiscoveryRow => ({
    authorAlias: publicWriterAlias(work.author),
    authorName: publicWriterName(work.author),
    chapterCount: work.chapters.length,
    commentCount: work._count.comments,
    completion: work.status === "published" ? "completed" : "ongoing",
    contentRating: work.contentRating,
    coverUrl: work.coverUrl,
    editorReviewStatus: work.editorReviewStatus,
    favoriteCount: work._count.favorites,
    genre: work.genre,
    hasPassportRecord: Boolean(work.passportRecord),
    id: work.id,
    language: work.language,
    publishedAt: work.publishedAt?.toISOString() ?? work.createdAt.toISOString(),
    readerCount: work._count.readingProgress,
    slug: work.slug,
    subtitle: work.subtitle,
    title: work.title,
    versionCount: work._count.versions,
  }));

  const first = totalCount === 0 ? 0 : (currentPage - 1) * PUBLISHER_WORK_PAGE_SIZE + 1;
  const last = totalCount === 0 ? 0 : first + rows.length - 1;

  return {
    currentPage,
    first,
    last,
    rows,
    totalCount,
    totalPages,
  };
}
