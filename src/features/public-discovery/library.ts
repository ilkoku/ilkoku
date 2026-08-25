import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { BLOCKED_PUBLIC_WORK_SLUGS } from "@/lib/public-content-safety";
import { publicTaxonomySlug } from "@/lib/public-taxonomy";

export const PUBLIC_WORK_PAGE_SIZE = 18;
export const publicWorkSorts = ["newest", "updated"] as const;

export type PublicWorkSort = (typeof publicWorkSorts)[number];

export type PublicWorkLibraryFilters = {
  genre?: string;
  search?: string;
  sort: PublicWorkSort;
};

const publicWorkPublicationWhere: Prisma.WorkWhereInput = {
  archivedAt: null,
  contentRating: {
    not: "adult_18",
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

const publicWorkBaseWhere: Prisma.WorkWhereInput = {
  ...publicWorkPublicationWhere,
  author: {
    is: {
      deletedAt: null,
      status: "active",
    },
  },
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
          publicId: true,
        },
      },
      description: true,
      contentRating: true,
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


export async function getPublicGenres() {
  const rows = await prisma.work.findMany({
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
  });

  const genresBySlug = new Map<
    string,
    { label: string; slug: string }
  >();

  for (const row of rows) {
    const label = row.genre?.trim();
    const slug = label ? publicTaxonomySlug(label) : "";

    if (label && slug && !genresBySlug.has(slug)) {
      genresBySlug.set(slug, { label, slug });
    }
  }

  return [...genresBySlug.values()];
}

export async function getPublicGenreBySlug(
  slug: string,
) {
  const genres = await getPublicGenres();

  return (
    genres.find((genre) => genre.slug === slug) ??
    null
  );
}

export async function getPublicAuthors() {
  return prisma.user.findMany({
    orderBy: [
      {
        displayName: "asc",
      },
      {
        fullName: "asc",
      },
    ],
    select: {
      _count: {
        select: {
          works: {
            where: publicWorkPublicationWhere,
          },
        },
      },
      displayName: true,
      fullName: true,
      publicId: true,
    },
    take: 500,
    where: {
      deletedAt: null,
      status: "active",
      works: {
        some: publicWorkPublicationWhere,
      },
    },
  });
}

export async function getPublicAuthorById(
  publicId: string,
) {
  return prisma.user.findFirst({
    select: {
      displayName: true,
      fullName: true,
      publicId: true,
      works: {
        orderBy: [
          {
            publishedAt: "desc",
          },
          {
            updatedAt: "desc",
          },
        ],
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
          description: true,
          contentRating: true,
          genre: true,
          publishedAt: true,
          slug: true,
          title: true,
          updatedAt: true,
        },
        where: publicWorkPublicationWhere,
      },
    },
    where: {
      deletedAt: null,
      publicId,
      status: "active",
      works: {
        some: publicWorkPublicationWhere,
      },
    },
  });
}

export async function getPublicWorkFeed() {
  return prisma.work.findMany({
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        publishedAt: "desc",
      },
    ],
    select: {
      author: {
        select: {
          displayName: true,
          fullName: true,
          publicId: true,
        },
      },
      description: true,
      genre: true,
      publishedAt: true,
      slug: true,
      title: true,
      updatedAt: true,
    },
    take: 50,
    where: publicWorkBaseWhere,
  });
}
