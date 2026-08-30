import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { commonDiscoveryAuthorWhereFor } from "@/features/discovery/common-author-scope";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import { availableGenreLabels } from "@/lib/genre-system";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 24;

export interface PublisherFollowingFilters {
  page: number;
  query: string;
}

export interface PublisherFollowingWork {
  chapterCount: number;
  firstChapterPosition: number | null;
  genre: string | null;
  id: string;
  slug: string;
  title: string;
}

export interface PublisherFollowingAuthorRow {
  alias: string;
  bio: string | null;
  city: string | null;
  commentCount: number;
  favoriteCount: number;
  followedAt: string;
  followId: string;
  genres: string[];
  id: string;
  latestWorks: PublisherFollowingWork[];
  name: string;
  publicId: string;
  publicWorkCount: number;
  readerCount: number;
  reviewedWorkCount: number;
}

export interface PublisherFollowingAuthorData {
  currentPage: number;
  first: number;
  last: number;
  rows: PublisherFollowingAuthorRow[];
  totalCount: number;
  totalPages: number;
}

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function normalizePublisherFollowingFilters(
  input: Record<string, string | string[] | undefined>,
): PublisherFollowingFilters {
  const requestedPage = Number.parseInt(firstValue(input.sayfa), 10);

  return {
    page:
      Number.isFinite(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1,
    query: firstValue(input.arama).slice(0, 220),
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

  if (username) {
    return username.startsWith("@") ? username : `@${username}`;
  }

  return `@${writer.publicId.toLocaleLowerCase("tr-TR")}`;
}

export async function getPublisherFollowingAuthors(
  publisherId: string,
  filters: PublisherFollowingFilters,
): Promise<PublisherFollowingAuthorData> {
  const publicWorkWhere = commonDiscoveryWorkWhereFor(false);
  const authorWhere: Prisma.UserWhereInput = {
    ...commonDiscoveryAuthorWhereFor(false),
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
  const where: Prisma.PublisherAuthorFollowWhereInput = {
    publisherId,
    author: authorWhere,
  };

  const totalCount = await prisma.publisherAuthorFollow.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);

  const follows = await prisma.publisherAuthorFollow.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      author: {
        select: {
          bio: true,
          displayName: true,
          id: true,
          profile: {
            select: {
              city: true,
            },
          },
          publicId: true,
          username: true,
        },
      },
      createdAt: true,
      id: true,
    },
  });

  const authorIds = follows.map((record) => record.author.id);
  const works =
    authorIds.length === 0
      ? []
      : await prisma.work.findMany({
          where: {
            ...publicWorkWhere,
            authorId: { in: authorIds },
          },
          orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
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
        });

  const worksByAuthor = new Map<string, typeof works>();

  for (const work of works) {
    const current = worksByAuthor.get(work.authorId) ?? [];
    current.push(work);
    worksByAuthor.set(work.authorId, current);
  }

  const first = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const last = Math.min(currentPage * PAGE_SIZE, totalCount);

  return {
    currentPage,
    first,
    last,
    rows: follows.map((record) => {
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
        followedAt: record.createdAt.toISOString(),
        followId: record.id,
        genres: availableGenreLabels(authorWorks.map((work) => work.genre)),
        id: record.author.id,
        latestWorks: authorWorks.slice(0, 3).map((work) => ({
          chapterCount: work.chapters.length,
          firstChapterPosition: work.chapters[0]?.position ?? null,
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
        reviewedWorkCount: authorWorks.filter(
          (work) => work.editorReviewStatus === "completed",
        ).length,
      };
    }),
    totalCount,
    totalPages,
  };
}
