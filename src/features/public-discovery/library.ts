import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { BLOCKED_PUBLIC_WORK_SLUGS } from "@/lib/public-content-safety";

export const PUBLIC_WORK_PAGE_SIZE = 18;
export const publicWorkSorts = ["newest", "updated"] as const;

export type PublicWorkSort = (typeof publicWorkSorts)[number];

export type PublicWorkLibraryFilters = {
  genre?: string;
  search?: string;
  sort: PublicWorkSort;
};

const publicWorkBaseWhere: Prisma.WorkWhereInput = {
  archivedAt: null,
  author: {
    is: {
      deletedAt: null,
      status: "active",
    },
  },
  language: "tr",
  publishedAt: {
    not: null,
  },
  slug: {
    notIn: [...BLOCKED_PUBLIC_WORK_SLUGS],
  },
  status: "published",
  visibility: "public",
};

function publicWorkWhere(
  filters: PublicWorkLibraryFilters,
): Prisma.WorkWhereInput {
  return {
    ...publicWorkBaseWhere,
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search } },
            { subtitle: { contains: filters.search } },
            { description: { contains: filters.search } },
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
    ...(filters.genre ? { genre: filters.genre } : {}),
  };
}

export async function getPublicWorkLibrary(
  filters: PublicWorkLibraryFilters,
  requestedPage: number,
) {
  const where = publicWorkWhere(filters);
  const [totalCount, genreRows] = await Promise.all([
    prisma.work.count({ where }),
    prisma.work.findMany({
      distinct: ["genre"],
      orderBy: {
        genre: "asc",
      },
      select: {
        genre: true,
      },
      take: 100,
      where: {
        ...publicWorkBaseWhere,
        genre: {
          not: null,
        },
      },
    }),
  ]);
  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PUBLIC_WORK_PAGE_SIZE),
  );
  const currentPage = Math.min(
    Math.max(1, requestedPage),
    totalPages,
  );
  const orderBy: Prisma.WorkOrderByWithRelationInput[] =
    filters.sort === "updated"
      ? [
          { updatedAt: "desc" },
          { publishedAt: "desc" },
        ]
      : [
          { publishedAt: "desc" },
          { createdAt: "desc" },
        ];

  const works = await prisma.work.findMany({
    orderBy,
    select: {
      _count: {
        select: {
          chapters: {
            where: {
              archivedAt: null,
              publishedAt: {
                not: null,
              },
              status: "published",
            },
          },
        },
      },
      author: {
        select: {
          displayName: true,
          fullName: true,
        },
      },
      description: true,
      genre: true,
      publishedAt: true,
      slug: true,
      subtitle: true,
      title: true,
      updatedAt: true,
    },
    skip: (currentPage - 1) * PUBLIC_WORK_PAGE_SIZE,
    take: PUBLIC_WORK_PAGE_SIZE,
    where,
  });

  return {
    currentPage,
    genres: genreRows
      .map((row) => row.genre?.trim())
      .filter((genre): genre is string => Boolean(genre)),
    totalCount,
    totalPages,
    works,
  };
}
