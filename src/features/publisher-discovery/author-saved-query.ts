import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { commonDiscoveryAuthorWhereFor } from "@/features/discovery/common-author-scope";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import {
  hasDiscoveryAdvancedFilters,
  matchesDiscoveryAdvancedAuthorFilters,
  type DiscoveryAdvancedFilters,
} from "@/lib/discovery-advanced-filters";
import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-list-standard";
import { availableGenreLabels } from "@/lib/genre-system";
import { prisma } from "@/lib/prisma";
import {
  normalizePublisherFollowingFilters,
  type PublisherFollowingFilters,
} from "./following-query";

export { normalizePublisherFollowingFilters };
export type { PublisherFollowingFilters };

export type PublisherAuthorSavedMode = "favorite" | "like";

export interface PublisherSavedAuthorWork {
  chapterCount: number;
  firstChapterPosition: number | null;
  genre: string | null;
  id: string;
  slug: string;
  title: string;
}

export interface PublisherSavedAuthorRow {
  alias: string;
  bio: string | null;
  city: string | null;
  commentCount: number;
  completedWorkCount: number;
  country: string | null;
  favoriteCount: number;
  genres: string[];
  id: string;
  latestWorks: PublisherSavedAuthorWork[];
  name: string;
  publicId: string;
  publicWorkCount: number;
  readerCount: number;
  recordId: string;
  reviewedWorkCount: number;
  savedAt: string;
}

export interface PublisherSavedAuthorData {
  currentPage: number;
  first: number;
  last: number;
  rows: PublisherSavedAuthorRow[];
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

  if (username) {
    return username.startsWith("@") ? username : `@${username}`;
  }

  return `@${writer.publicId.toLocaleLowerCase("tr-TR")}`;
}

const authorSelect = {
  bio: true,
  displayName: true,
  id: true,
  profile: {
    select: {
      city: true,
      country: true,
    },
  },
  publicId: true,
  username: true,
} satisfies Prisma.UserSelect;

type SavedRecord = {
  author: {
    bio: string | null;
    displayName: string | null;
    id: string;
    profile: {
      city: string | null;
      country: string | null;
    } | null;
    publicId: string;
    username: string | null;
  };
  createdAt: Date;
  id: string;
};

const authorWorkSelect = {
  _count: {
    select: {
      comments: {
        where: {
          deletedAt: null,
          status: "visible" as const,
        },
      },
      favorites: true,
      readingProgress: true,
    },
  },
  authorId: true,
  chapters: {
    where: { archivedAt: null },
    orderBy: { position: "asc" as const },
    select: {
      id: true,
      position: true,
      publishedAt: true,
      status: true,
    },
  },
  editorReviewStatus: true,
  genre: true,
  id: true,
  slug: true,
  title: true,
} satisfies Prisma.WorkSelect;

type AuthorWork = Prisma.WorkGetPayload<{ select: typeof authorWorkSelect }>;

function mapSavedRows(
  records: SavedRecord[],
  works: AuthorWork[],
): PublisherSavedAuthorRow[] {
  const worksByAuthor = new Map<string, AuthorWork[]>();
  for (const work of works) {
    const current = worksByAuthor.get(work.authorId) ?? [];
    current.push(work);
    worksByAuthor.set(work.authorId, current);
  }

  return records.map((record) => {
    const authorWorks = worksByAuthor.get(record.author.id) ?? [];
    const completedWorkCount = authorWorks.filter((work) => {
      const publishedChapters = work.chapters.filter(
        (chapter) =>
          chapter.status === "published" && chapter.publishedAt !== null,
      );
      const hasPendingChapter = work.chapters.some(
        (chapter) =>
          chapter.status !== "published" || chapter.publishedAt === null,
      );
      return publishedChapters.length > 0 && !hasPendingChapter;
    }).length;

    return {
      alias: publicWriterAlias(record.author),
      bio: record.author.bio,
      city: record.author.profile?.city ?? null,
      commentCount: authorWorks.reduce(
        (total, work) => total + work._count.comments,
        0,
      ),
      completedWorkCount,
      country: record.author.profile?.country ?? null,
      favoriteCount: authorWorks.reduce(
        (total, work) => total + work._count.favorites,
        0,
      ),
      genres: availableGenreLabels(authorWorks.map((work) => work.genre)),
      id: record.author.id,
      latestWorks: authorWorks.slice(0, 3).map((work) => {
        const publishedChapters = work.chapters.filter(
          (chapter) =>
            chapter.status === "published" && chapter.publishedAt !== null,
        );
        return {
          chapterCount: publishedChapters.length,
          firstChapterPosition: publishedChapters[0]?.position ?? null,
          genre: work.genre,
          id: work.id,
          slug: work.slug,
          title: work.title,
        };
      }),
      name: publicWriterName(record.author),
      publicId: record.author.publicId,
      publicWorkCount: authorWorks.length,
      readerCount: authorWorks.reduce(
        (total, work) => total + work._count.readingProgress,
        0,
      ),
      recordId: record.id,
      reviewedWorkCount: authorWorks.filter(
        (work) => work.editorReviewStatus === "completed",
      ).length,
      savedAt: record.createdAt.toISOString(),
    };
  });
}

function matchesAdvancedAuthor(
  row: PublisherSavedAuthorRow,
  filters: DiscoveryAdvancedFilters,
) {
  return matchesDiscoveryAdvancedAuthorFilters(
    {
      commentCount: row.commentCount,
      completedWorkCount: row.completedWorkCount,
      country: row.country,
      favoriteCount: row.favoriteCount,
      publicWorkCount: row.publicWorkCount,
      readerCount: row.readerCount,
      reviewedWorkCount: row.reviewedWorkCount,
    },
    filters,
  );
}

async function getRecords(
  publisherId: string,
  authorWhere: Prisma.UserWhereInput,
  mode: PublisherAuthorSavedMode,
  pagination?: { skip: number; take: number },
): Promise<SavedRecord[]> {
  const common = {
    orderBy: { createdAt: "desc" as const },
    ...(pagination ?? {}),
    select: {
      author: { select: authorSelect },
      createdAt: true,
      id: true,
    },
  };

  return mode === "like"
    ? prisma.publisherAuthorLike.findMany({
        where: { author: authorWhere, publisherId },
        ...common,
      })
    : prisma.publisherAuthorFavorite.findMany({
        where: { author: authorWhere, publisherId },
        ...common,
      });
}

export async function getPublisherSavedAuthors(
  publisherId: string,
  filters: PublisherFollowingFilters,
  mode: PublisherAuthorSavedMode,
  canAccessAdultContent = false,
): Promise<PublisherSavedAuthorData> {
  const contentRating =
    filters.contentRating === "adult_18" && !canAccessAdultContent
      ? undefined
      : filters.contentRating;
  const matchedWorkWhere: Prisma.WorkWhereInput = {
    ...commonDiscoveryWorkWhereFor(canAccessAdultContent),
    ...(filters.genre ? { genre: filters.genre } : {}),
    ...(contentRating ? { contentRating } : {}),
  };
  const authorWhere: Prisma.UserWhereInput = {
    ...commonDiscoveryAuthorWhereFor(canAccessAdultContent, {
      ...(filters.genre ? { genre: filters.genre } : {}),
      ...(contentRating ? { contentRating } : {}),
    }),
    ...(filters.query
      ? {
          OR: [
            { displayName: { contains: filters.query } },
            { username: { contains: filters.query } },
            { publicId: { contains: filters.query } },
            {
              works: {
                some: {
                  ...matchedWorkWhere,
                  title: { contains: filters.query },
                },
              },
            },
          ],
        }
      : {}),
    ...(filters.city
      ? {
          profile: {
            is: {
              city: { contains: filters.city },
            },
          },
        }
      : {}),
  };
  const usesAdvancedFilters = hasDiscoveryAdvancedFilters(filters.advanced);

  let rows: PublisherSavedAuthorRow[];
  let totalCount: number;
  let totalPages: number;
  let currentPage: number;

  if (usesAdvancedFilters) {
    const allRecords = await getRecords(publisherId, authorWhere, mode);
    const authorIds = allRecords.map((record) => record.author.id);
    const works = authorIds.length
      ? await prisma.work.findMany({
          where: {
            ...matchedWorkWhere,
            authorId: { in: authorIds },
          },
          orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
          select: authorWorkSelect,
        })
      : [];
    const allRows = mapSavedRows(allRecords, works).filter((row) =>
      matchesAdvancedAuthor(row, filters.advanced),
    );
    totalCount = allRows.length;
    totalPages = Math.max(1, Math.ceil(totalCount / DISCOVERY_PAGE_SIZE));
    currentPage = Math.min(filters.page, totalPages);
    rows = allRows.slice(
      (currentPage - 1) * DISCOVERY_PAGE_SIZE,
      currentPage * DISCOVERY_PAGE_SIZE,
    );
  } else {
    totalCount =
      mode === "like"
        ? await prisma.publisherAuthorLike.count({
            where: { author: authorWhere, publisherId },
          })
        : await prisma.publisherAuthorFavorite.count({
            where: { author: authorWhere, publisherId },
          });
    totalPages = Math.max(1, Math.ceil(totalCount / DISCOVERY_PAGE_SIZE));
    currentPage = Math.min(filters.page, totalPages);
    const records = await getRecords(publisherId, authorWhere, mode, {
      skip: (currentPage - 1) * DISCOVERY_PAGE_SIZE,
      take: DISCOVERY_PAGE_SIZE,
    });
    const authorIds = records.map((record) => record.author.id);
    const works = authorIds.length
      ? await prisma.work.findMany({
          where: {
            ...matchedWorkWhere,
            authorId: { in: authorIds },
          },
          orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
          select: authorWorkSelect,
        })
      : [];
    rows = mapSavedRows(records, works);
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
