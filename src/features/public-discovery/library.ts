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

const publicWorkSelect = {
  _count: {
    select: {
      chapters: {
        where: {
          archivedAt: null,
          publishedAt: {
            not: null,
          },
          status: "published" as const,
        },
      },
    },
  },
  author: {
    select: {
      displayName: true,
      fullName: true,
      publicId: true,
      username: true,
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
} satisfies Prisma.WorkSelect;

export async function getPublicWorkLibrary(
  filters: PublicWorkLibraryFilters,
  requestedPage: number,
) {
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
  const genreRowsQuery = prisma.work.findMany({
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

  if (filters.search) {
    const needle = filters.search
      .trim()
      .toLocaleLowerCase("tr-TR");
    const whereWithoutSearch = publicWorkWhere({
      ...filters,
      search: undefined,
    });
    const [genreRows, candidates] = await Promise.all([
      genreRowsQuery,
      prisma.work.findMany({
        orderBy,
        select: publicWorkSelect,
        take: 5000,
        where: whereWithoutSearch,
      }),
    ]);
    const containsNeedle = (value: string | null | undefined) =>
      Boolean(
        value
          ?.toLocaleLowerCase("tr-TR")
          .includes(needle),
      );
    const matchingWorks = candidates.filter((work) =>
      [
        work.title,
        work.subtitle,
        work.description,
        work.author.displayName,
        work.author.fullName,
        work.author.username,
      ].some(containsNeedle),
    );
    const totalCount = matchingWorks.length;
    const totalPages = Math.max(
      1,
      Math.ceil(totalCount / PUBLIC_WORK_PAGE_SIZE),
    );
    const currentPage = Math.min(
      Math.max(1, requestedPage),
      totalPages,
    );
    const start =
      (currentPage - 1) * PUBLIC_WORK_PAGE_SIZE;

    return {
      currentPage,
      genres: genreRows
        .map((row) => row.genre?.trim())
        .filter((genre): genre is string => Boolean(genre)),
      totalCount,
      totalPages,
      works: matchingWorks.slice(
        start,
        start + PUBLIC_WORK_PAGE_SIZE,
      ),
    };
  }

  const where = publicWorkWhere(filters);
  const [totalCount, genreRows] = await Promise.all([
    prisma.work.count({ where }),
    genreRowsQuery,
  ]);
  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PUBLIC_WORK_PAGE_SIZE),
  );
  const currentPage = Math.min(
    Math.max(1, requestedPage),
    totalPages,
  );
  const works = await prisma.work.findMany({
    orderBy,
    select: publicWorkSelect,
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

export async function getPublicGenres(search?: string) {
  const normalizedSearch = search?.trim().slice(0, 120);
  const rows = await prisma.work.groupBy({
    _count: {
      _all: true,
    },
    by: ["genre"],
    orderBy: {
      genre: "asc",
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
    { count: number; label: string; slug: string }
  >();

  for (const row of rows) {
    const label = row.genre?.trim();
    const slug = label ? publicTaxonomySlug(label) : "";

    if (!label || !slug) {
      continue;
    }

    const existing = genresBySlug.get(slug);

    if (existing) {
      existing.count += row._count._all;
      continue;
    }

    genresBySlug.set(slug, {
      count: row._count._all,
      label,
      slug,
    });
  }

  const genres = [...genresBySlug.values()];

  if (!normalizedSearch) {
    return genres;
  }

  const needle = normalizedSearch.toLocaleLowerCase("tr-TR");
  return genres.filter((genre) =>
    genre.label
      .toLocaleLowerCase("tr-TR")
      .includes(needle),
  );
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

export async function getPublicAuthors(search?: string) {
  const normalizedSearch = search?.trim().slice(0, 100);
  const authors = await prisma.user.findMany({
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
      username: true,
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

  if (!normalizedSearch) {
    return authors;
  }

  const needle = normalizedSearch.toLocaleLowerCase("tr-TR");
  return authors.filter((author) =>
    [
      author.displayName,
      author.fullName,
      author.username,
    ].some((value) =>
      Boolean(
        value
          ?.toLocaleLowerCase("tr-TR")
          .includes(needle),
      ),
    ),
  );
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
