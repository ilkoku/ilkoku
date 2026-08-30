import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import {
  matchesDiscoveryAdvancedWorkFilters,
  type DiscoveryAdvancedFilters,
} from "@/lib/discovery-advanced-filters";
import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-list-standard";
import { prisma } from "@/lib/prisma";
import type { MemberStoredWorkContentRating } from "@/lib/work-content-classification";
import { countWords } from "./eligibility";
import type { EditorWorkCardData } from "./types";

export type EditorCollectionReviewStatus = EditorWorkCardData["editorReviewStatus"];
export type EditorCollectionWordCount = "long" | "medium" | "short";

export type EditorCollectionFilters = {
  advanced: DiscoveryAdvancedFilters;
  contentRating?: MemberStoredWorkContentRating;
  genre?: string;
  language?: string;
  page: number;
  reviewStatus?: EditorCollectionReviewStatus;
  search?: string;
  wordCount?: EditorCollectionWordCount;
};

export type EditorCollectionData<T> = {
  currentPage: number;
  rows: T[];
  totalCount: number;
  totalPages: number;
};

function workFilters(
  canAccessAdultContent: boolean,
  filters: EditorCollectionFilters,
): Prisma.WorkWhereInput {
  return {
    ...commonDiscoveryWorkWhereFor(canAccessAdultContent),
    ...(filters.genre ? { genre: filters.genre } : {}),
    ...(filters.contentRating ? { contentRating: filters.contentRating } : {}),
    ...(filters.language ? { language: filters.language } : {}),
    ...(filters.reviewStatus
      ? { editorReviewStatus: filters.reviewStatus }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search } },
            { subtitle: { contains: filters.search } },
            {
              author: {
                is: {
                  OR: [
                    { displayName: { contains: filters.search } },
                    { fullName: { contains: filters.search } },
                    { username: { contains: filters.search } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
}

const editorCardWorkSelect = (editorId: string) => ({
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
  assignedEditorId: true,
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
    select: {
      content: true,
      publishedAt: true,
      status: true,
    },
  },
  contentRating: true,
  coverUrl: true,
  editorFavorites: {
    where: { editorId },
    select: { id: true },
    take: 1,
  },
  editorReviewStatus: true,
  genre: true,
  id: true,
  language: true,
  publishedAt: true,
  slug: true,
  title: true,
  updatedAt: true,
}) as const;

type SelectedEditorWork = Prisma.WorkGetPayload<{
  select: ReturnType<typeof editorCardWorkSelect>;
}>;

type EditorCollectionMappedWork = EditorWorkCardData & {
  authorUsername: string | null;
  commentCount: number;
  completionStatus: "completed" | "ongoing";
  favoriteCount: number;
  hasPassport: boolean;
  publishedAt: Date | null;
  readerCount: number;
  updatedAt: Date;
  versionCount: number;
};

function mapEditorCard(work: SelectedEditorWork): EditorCollectionMappedWork {
  const publishedChapters = work.chapters.filter(
    (chapter) => chapter.status === "published" && chapter.publishedAt !== null,
  );
  const hasPendingChapter = work.chapters.some(
    (chapter) => chapter.status !== "published" || chapter.publishedAt === null,
  );

  return {
    assignedEditorId: work.assignedEditorId,
    authorName: work.author.displayName ?? work.author.fullName,
    authorUsername: work.author.username,
    chapterCount: publishedChapters.length,
    commentCount: work._count.comments,
    completionStatus:
      publishedChapters.length > 0 && !hasPendingChapter ? "completed" : "ongoing",
    contentRating: work.contentRating,
    coverUrl: work.coverUrl,
    editorReviewStatus: work.editorReviewStatus,
    favoriteCount: work._count.favorites,
    genre: work.genre,
    hasPassport:
      work._count.ownershipStamps > 0 || work._count.versions > 0,
    id: work.id,
    isFavorite: work.editorFavorites.length > 0,
    language: work.language,
    publishedAt: work.publishedAt,
    readerCount: work._count.readingProgress,
    slug: work.slug,
    title: work.title,
    totalWords: publishedChapters.reduce(
      (total, chapter) => total + countWords(chapter.content),
      0,
    ),
    updatedAt: work.updatedAt,
    versionCount: work._count.versions,
  };
}

function matchesWordCount(total: number, value?: EditorCollectionWordCount) {
  if (value === "short") return total < 30_000;
  if (value === "medium") return total >= 30_000 && total <= 80_000;
  if (value === "long") return total > 80_000;
  return true;
}

function matchesCollectionFilters(
  work: EditorCollectionMappedWork,
  filters: EditorCollectionFilters,
) {
  if (!matchesWordCount(work.totalWords, filters.wordCount)) return false;

  return matchesDiscoveryAdvancedWorkFilters(
    {
      authorName: work.authorName,
      authorUsername: work.authorUsername,
      chapterCount: work.chapterCount,
      commentCount: work.commentCount,
      completionStatus: work.completionStatus,
      favoriteCount: work.favoriteCount,
      hasPassport: work.hasPassport,
      publishedAt: work.publishedAt,
      readerCount: work.readerCount,
      updatedAt: work.updatedAt,
      versionCount: work.versionCount,
    },
    filters.advanced,
  );
}

function pageData<T>(rows: T[], requestedPage: number): EditorCollectionData<T> {
  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / DISCOVERY_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  return {
    currentPage,
    rows: rows.slice(
      (currentPage - 1) * DISCOVERY_PAGE_SIZE,
      currentPage * DISCOVERY_PAGE_SIZE,
    ),
    totalCount,
    totalPages,
  };
}

export async function getEditorFavoriteCollection(
  editorId: string,
  filters: EditorCollectionFilters,
  canAccessAdultContent: boolean,
): Promise<EditorCollectionData<EditorWorkCardData>> {
  const where: Prisma.EditorFavoriteWhereInput = {
    editorId,
    work: workFilters(canAccessAdultContent, filters),
  };
  const records = await prisma.editorFavorite.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      work: {
        select: editorCardWorkSelect(editorId),
      },
    },
  });
  const rows = records
    .map(({ work }) => mapEditorCard(work))
    .filter((work) => matchesCollectionFilters(work, filters));

  return pageData(rows, filters.page);
}

export type EditorSelectionRow = {
  authorName: string;
  id: string;
  slug: string;
  title: string;
};

export async function getEditorSelectionCollection(
  editorId: string,
  filters: Omit<EditorCollectionFilters, "reviewStatus">,
  canAccessAdultContent: boolean,
): Promise<EditorCollectionData<EditorSelectionRow>> {
  const fullFilters: EditorCollectionFilters = {
    ...filters,
    reviewStatus: "completed",
  };
  const where: Prisma.WorkWhereInput = {
    ...workFilters(canAccessAdultContent, fullFilters),
    OR: [
      { assignedEditorId: editorId },
      {
        editorReviewAssignments: {
          some: {
            editorId,
            stage: "second",
            status: "completed",
          },
        },
      },
    ],
  };
  const works = await prisma.work.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: editorCardWorkSelect(editorId),
  });
  const rows = works
    .map(mapEditorCard)
    .filter((work) => matchesCollectionFilters(work, fullFilters))
    .map((work) => ({
      authorName: work.authorName,
      id: work.id,
      slug: work.slug,
      title: work.title,
    }));

  return pageData(rows, filters.page);
}
