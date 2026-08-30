import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-list-standard";
import { prisma } from "@/lib/prisma";
import type { MemberStoredWorkContentRating } from "@/lib/work-content-classification";
import { countWords } from "./eligibility";
import type { EditorWorkCardData } from "./types";

export type EditorCollectionReviewStatus = EditorWorkCardData["editorReviewStatus"];

export type EditorCollectionFilters = {
  contentRating?: MemberStoredWorkContentRating;
  genre?: string;
  page: number;
  reviewStatus?: EditorCollectionReviewStatus;
  search?: string;
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
  assignedEditorId: true,
  author: {
    select: {
      displayName: true,
      fullName: true,
    },
  },
  chapters: {
    where: {
      archivedAt: null,
      publishedAt: { not: null },
      status: "published" as const,
    },
    select: {
      content: true,
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
  slug: true,
  title: true,
}) as const;

function mapEditorCard(
  work: {
    assignedEditorId: string | null;
    author: { displayName: string | null; fullName: string };
    chapters: { content: string }[];
    contentRating: EditorWorkCardData["contentRating"];
    coverUrl: string | null;
    editorFavorites: { id: string }[];
    editorReviewStatus: EditorWorkCardData["editorReviewStatus"];
    genre: string | null;
    id: string;
    language: string;
    slug: string;
    title: string;
  },
): EditorWorkCardData {
  return {
    assignedEditorId: work.assignedEditorId,
    authorName: work.author.displayName ?? work.author.fullName,
    chapterCount: work.chapters.length,
    contentRating: work.contentRating,
    coverUrl: work.coverUrl,
    editorReviewStatus: work.editorReviewStatus,
    genre: work.genre,
    id: work.id,
    isFavorite: work.editorFavorites.length > 0,
    language: work.language,
    slug: work.slug,
    title: work.title,
    totalWords: work.chapters.reduce(
      (total, chapter) => total + countWords(chapter.content),
      0,
    ),
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
  const totalCount = await prisma.editorFavorite.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / DISCOVERY_PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const records = await prisma.editorFavorite.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * DISCOVERY_PAGE_SIZE,
    take: DISCOVERY_PAGE_SIZE,
    select: {
      work: {
        select: editorCardWorkSelect(editorId),
      },
    },
  });

  return {
    currentPage,
    rows: records.map(({ work }) => mapEditorCard(work)),
    totalCount,
    totalPages,
  };
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
  const where: Prisma.WorkWhereInput = {
    ...workFilters(canAccessAdultContent, {
      ...filters,
      reviewStatus: "completed",
    }),
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
  const totalCount = await prisma.work.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / DISCOVERY_PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const works = await prisma.work.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: (currentPage - 1) * DISCOVERY_PAGE_SIZE,
    take: DISCOVERY_PAGE_SIZE,
    select: {
      author: {
        select: {
          displayName: true,
          fullName: true,
        },
      },
      id: true,
      slug: true,
      title: true,
    },
  });

  return {
    currentPage,
    rows: works.map((work) => ({
      authorName: work.author.displayName ?? work.author.fullName,
      id: work.id,
      slug: work.slug,
      title: work.title,
    })),
    totalCount,
    totalPages,
  };
}
