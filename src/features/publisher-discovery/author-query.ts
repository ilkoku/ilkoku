import type { Prisma } from "@/generated/prisma/client";
import { commonDiscoveryAuthorWhereFor } from "@/features/discovery/common-author-scope";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import {
  hasDiscoveryAdvancedFilters,
  matchesDiscoveryAdvancedAuthorFilters,
  parseDiscoveryAdvancedFilters,
  type DiscoveryAdvancedFilters,
} from "@/lib/discovery-advanced-filters";
import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-list-standard";
import {
  availableGenreLabels,
  normalizeGenreLabel,
} from "@/lib/genre-system";
import { prisma } from "@/lib/prisma";
import {
  isMemberStoredWorkContentRating,
  type MemberStoredWorkContentRating,
} from "@/lib/work-content-classification";

export const PUBLISHER_AUTHOR_PAGE_SIZE = DISCOVERY_PAGE_SIZE;

export interface PublisherAuthorDiscoveryFilters {
  advanced: DiscoveryAdvancedFilters;
  city: string;
  contentRating: MemberStoredWorkContentRating | "";
  genre: string;
  page: number;
  query: string;
}

export interface PublisherAuthorDiscoveryWork {
  chapterCount: number;
  commentCount: number;
  favoriteCount: number;
  genre: string | null;
  id: string;
  publishedAt: string;
  readerCount: number;
  slug: string;
  title: string;
}

export interface PublisherAuthorDiscoveryRow {
  alias: string;
  bio: string | null;
  city: string | null;
  commentCount: number;
  completedWorkCount: number;
  country: string | null;
  favoriteCount: number;
  genres: string[];
  id: string;
  latestWorks: PublisherAuthorDiscoveryWork[];
  name: string;
  publicId: string;
  publicWorkCount: number;
  readerCount: number;
  reviewedWorkCount: number;
}

export interface PublisherAuthorDiscoveryData {
  currentPage: number;
  first: number;
  last: number;
  rows: PublisherAuthorDiscoveryRow[];
  totalCount: number;
  totalPages: number;
}

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function normalizePublisherAuthorDiscoveryFilters(
  input: Record<string, string | string[] | undefined>,
): PublisherAuthorDiscoveryFilters {
  const requestedPage = Number.parseInt(firstValue(input.sayfa), 10);
  const requestedRating = firstValue(input.hitap);
  const genre = normalizeGenreLabel(firstValue(input.tur));

  return {
    advanced: parseDiscoveryAdvancedFilters(input),
    city: firstValue(input.sehir).slice(0, 120),
    contentRating: isMemberStoredWorkContentRating(requestedRating)
      ? requestedRating
      : "",
    genre: genre ?? "",
    page:
      Number.isFinite(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1,
    query: firstValue(input.arama).slice(0, 220),
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

type SelectedAuthor = Prisma.UserGetPayload<{ select: typeof authorSelect }>;

const workSelect = {
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
    where: {
      archivedAt: null,
    },
    orderBy: {
      position: "asc" as const,
    },
    select: {
      id: true,
      publishedAt: true,
      status: true,
    },
  },
  editorReviewStatus: true,
  genre: true,
  id: true,
  publishedAt: true,
  slug: true,
  title: true,
} satisfies Prisma.WorkSelect;

type SelectedWork = Prisma.WorkGetPayload<{ select: typeof workSelect }>;

function mapRows(authors: SelectedAuthor[], publicWorks: SelectedWork[]) {
  const worksByAuthor = new Map<string, SelectedWork[]>();

  for (const work of publicWorks) {
    const current = worksByAuthor.get(work.authorId) ?? [];
    current.push(work);
    worksByAuthor.set(work.authorId, current);
  }

  return authors.map((author): PublisherAuthorDiscoveryRow => {
    const works = worksByAuthor.get(author.id) ?? [];
    const completedWorkCount = works.filter((work) => {
      const publishedChapterCount = work.chapters.filter(
        (chapter) =>
          chapter.status === "published" && chapter.publishedAt !== null,
      ).length;
      const hasPendingChapter = work.chapters.some(
        (chapter) =>
          chapter.status !== "published" || chapter.publishedAt === null,
      );

      return publishedChapterCount > 0 && !hasPendingChapter;
    }).length;

    return {
      alias: publicWriterAlias(author),
      bio: author.bio,
      city: author.profile?.city ?? null,
      commentCount: works.reduce(
        (total, work) => total + work._count.comments,
        0,
      ),
      completedWorkCount,
      country: author.profile?.country ?? null,
      favoriteCount: works.reduce(
        (total, work) => total + work._count.favorites,
        0,
      ),
      genres: availableGenreLabels(works.map((work) => work.genre)),
      id: author.id,
      latestWorks: works.slice(0, 3).map((work) => ({
        chapterCount: work.chapters.filter(
          (chapter) =>
            chapter.status === "published" && chapter.publishedAt !== null,
        ).length,
        commentCount: work._count.comments,
        favoriteCount: work._count.favorites,
        genre: work.genre,
        id: work.id,
        publishedAt:
          work.publishedAt?.toISOString() ?? new Date(0).toISOString(),
        readerCount: work._count.readingProgress,
        slug: work.slug,
        title: work.title,
      })),
      name: publicWriterName(author),
      publicId: author.publicId,
      publicWorkCount: works.length,
      readerCount: works.reduce(
        (total, work) => total + work._count.readingProgress,
        0,
      ),
      reviewedWorkCount: works.filter(
        (work) => work.editorReviewStatus === "completed",
      ).length,
    };
  });
}

function matchesAdvancedAuthor(
  row: PublisherAuthorDiscoveryRow,
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

export async function getPublisherAuthorDiscovery(
  filters: PublisherAuthorDiscoveryFilters,
  canAccessAdultContent = false,
): Promise<PublisherAuthorDiscoveryData> {
  const contentRating =
    filters.contentRating === "adult_18" && !canAccessAdultContent
      ? ""
      : filters.contentRating;
  const publicWorkWhere = commonDiscoveryWorkWhereFor(canAccessAdultContent);
  const matchedWorkWhere: Prisma.WorkWhereInput = {
    ...publicWorkWhere,
    ...(filters.genre ? { genre: filters.genre } : {}),
    ...(contentRating ? { contentRating } : {}),
  };
  const conditions: Prisma.UserWhereInput[] = [];

  if (filters.query) {
    conditions.push({
      OR: [
        { displayName: { contains: filters.query } },
        { username: { contains: filters.query } },
        { bio: { contains: filters.query } },
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
    });
  }

  if (filters.city) {
    conditions.push({
      profile: {
        is: {
          city: { contains: filters.city },
        },
      },
    });
  }

  const where: Prisma.UserWhereInput = {
    ...commonDiscoveryAuthorWhereFor(canAccessAdultContent, {
      ...(filters.genre ? { genre: filters.genre } : {}),
      ...(contentRating ? { contentRating } : {}),
    }),
    ...(conditions.length > 0 ? { AND: conditions } : {}),
  };
  const orderBy: Prisma.UserOrderByWithRelationInput[] = [
    { updatedAt: "desc" },
    { createdAt: "desc" },
  ];
  const usesAdvancedFilters = hasDiscoveryAdvancedFilters(filters.advanced);

  let rows: PublisherAuthorDiscoveryRow[];
  let totalCount: number;
  let totalPages: number;
  let currentPage: number;

  if (usesAdvancedFilters) {
    const authors = await prisma.user.findMany({
      where,
      orderBy,
      select: authorSelect,
    });
    const publicWorks =
      authors.length === 0
        ? []
        : await prisma.work.findMany({
            where: {
              ...matchedWorkWhere,
              authorId: { in: authors.map((author) => author.id) },
            },
            orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
            select: workSelect,
          });
    const allRows = mapRows(authors, publicWorks).filter((row) =>
      matchesAdvancedAuthor(row, filters.advanced),
    );
    totalCount = allRows.length;
    totalPages = Math.max(1, Math.ceil(totalCount / PUBLISHER_AUTHOR_PAGE_SIZE));
    currentPage = Math.min(filters.page, totalPages);
    rows = allRows.slice(
      (currentPage - 1) * PUBLISHER_AUTHOR_PAGE_SIZE,
      currentPage * PUBLISHER_AUTHOR_PAGE_SIZE,
    );
  } else {
    totalCount = await prisma.user.count({ where });
    totalPages = Math.max(
      1,
      Math.ceil(totalCount / PUBLISHER_AUTHOR_PAGE_SIZE),
    );
    currentPage = Math.min(filters.page, totalPages);
    const authors = await prisma.user.findMany({
      where,
      orderBy,
      skip: (currentPage - 1) * PUBLISHER_AUTHOR_PAGE_SIZE,
      take: PUBLISHER_AUTHOR_PAGE_SIZE,
      select: authorSelect,
    });
    const publicWorks =
      authors.length === 0
        ? []
        : await prisma.work.findMany({
            where: {
              ...matchedWorkWhere,
              authorId: { in: authors.map((author) => author.id) },
            },
            orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
            select: workSelect,
          });
    rows = mapRows(authors, publicWorks);
  }

  const first =
    totalCount === 0
      ? 0
      : (currentPage - 1) * PUBLISHER_AUTHOR_PAGE_SIZE + 1;
  const last = Math.min(currentPage * PUBLISHER_AUTHOR_PAGE_SIZE, totalCount);

  return {
    currentPage,
    first,
    last,
    rows,
    totalCount,
    totalPages,
  };
}
