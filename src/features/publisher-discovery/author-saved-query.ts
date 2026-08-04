import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  normalizePublisherFollowingFilters,
  type PublisherFollowingFilters,
} from "./following-query";

export { normalizePublisherFollowingFilters };
export type { PublisherFollowingFilters };

const PAGE_SIZE = 12;

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
  return (
    writer.displayName?.trim() ||
    writer.username?.trim() ||
    writer.publicId
  );
}

function publicWriterAlias(writer: {
  publicId: string;
  username: string | null;
}) {
  const username = writer.username?.trim();

  if (username) {
    return username.startsWith("@")
      ? username
      : `@${username}`;
  }

  return `@${writer.publicId.toLocaleLowerCase("tr-TR")}`;
}

function parseGenres(value: string | null) {
  if (!value) return [];

  let values: string[] = [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      values = parsed.filter(
        (item): item is string => typeof item === "string",
      );
    }
  } catch {
    values = value.split(",");
  }

  return Array.from(
    new Set(
      values
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 6);
}

const publicWorkWhere = {
  archivedAt: null,
  publishedAt: { not: null },
  status: "published",
  visibility: "public",
} satisfies Prisma.WorkWhereInput;

const authorSelect = {
  bio: true,
  displayName: true,
  id: true,
  profile: {
    select: {
      city: true,
      writingGenres: true,
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
      writingGenres: string | null;
    } | null;
    publicId: string;
    username: string | null;
  };
  createdAt: Date;
  id: string;
};

export async function getPublisherSavedAuthors(
  publisherId: string,
  filters: PublisherFollowingFilters,
  mode: PublisherAuthorSavedMode,
): Promise<PublisherSavedAuthorData> {
  const authorWhere: Prisma.UserWhereInput = {
    deletedAt: null,
    role: "writer",
    status: "active",
    works: { some: publicWorkWhere },
    ...(filters.query
      ? {
          OR: [
            { displayName: { contains: filters.query } },
            { username: { contains: filters.query } },
            { publicId: { contains: filters.query } },
            {
              works: {
                some: {
                  ...publicWorkWhere,
                  title: { contains: filters.query },
                },
              },
            },
          ],
        }
      : {}),
  };

  const totalCount =
    mode === "like"
      ? await prisma.publisherAuthorLike.count({
          where: {
            author: authorWhere,
            publisherId,
          },
        })
      : await prisma.publisherAuthorFavorite.count({
          where: {
            author: authorWhere,
            publisherId,
          },
        });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const pagination = {
    orderBy: { createdAt: "desc" as const },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  };

  const records: SavedRecord[] =
    mode === "like"
      ? await prisma.publisherAuthorLike.findMany({
          where: {
            author: authorWhere,
            publisherId,
          },
          ...pagination,
          select: {
            author: { select: authorSelect },
            createdAt: true,
            id: true,
          },
        })
      : await prisma.publisherAuthorFavorite.findMany({
          where: {
            author: authorWhere,
            publisherId,
          },
          ...pagination,
          select: {
            author: { select: authorSelect },
            createdAt: true,
            id: true,
          },
        });

  const authorIds = records.map((record) => record.author.id);
  const works = authorIds.length
    ? await prisma.work.findMany({
        where: {
          ...publicWorkWhere,
          authorId: { in: authorIds },
        },
        orderBy: [
          { publishedAt: "desc" },
          { updatedAt: "desc" },
        ],
        select: {
          _count: {
            select: {
              comments: {
                where: {
                  deletedAt: null,
                  status: "visible",
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
              publishedAt: { not: null },
              status: "published",
            },
            orderBy: { position: "asc" },
            select: {
              id: true,
              position: true,
            },
          },
          editorReviewStatus: true,
          genre: true,
          id: true,
          slug: true,
          title: true,
        },
      })
    : [];

  const worksByAuthor = new Map<string, typeof works>();
  for (const work of works) {
    const current = worksByAuthor.get(work.authorId) ?? [];
    current.push(work);
    worksByAuthor.set(work.authorId, current);
  }

  const first =
    totalCount === 0
      ? 0
      : (currentPage - 1) * PAGE_SIZE + 1;
  const last = Math.min(currentPage * PAGE_SIZE, totalCount);

  return {
    currentPage,
    first,
    last,
    rows: records.map((record) => {
      const authorWorks = worksByAuthor.get(record.author.id) ?? [];

      return {
        alias: publicWriterAlias(record.author),
        bio: record.author.bio,
        city: record.author.profile?.city ?? null,
        commentCount: authorWorks.reduce(
          (total, work) => total + work._count.comments,
          0,
        ),
        favoriteCount: authorWorks.reduce(
          (total, work) => total + work._count.favorites,
          0,
        ),
        genres: parseGenres(
          record.author.profile?.writingGenres ?? null,
        ),
        id: record.author.id,
        latestWorks: authorWorks.slice(0, 3).map((work) => ({
          chapterCount: work.chapters.length,
          firstChapterPosition:
            work.chapters[0]?.position ?? null,
          genre: work.genre,
          id: work.id,
          slug: work.slug,
          title: work.title,
        })),
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
    }),
    totalCount,
    totalPages,
  };
}
