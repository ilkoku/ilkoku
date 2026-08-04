import type {
  Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 12;

export interface PublisherAuthorDiscoveryFilters {
  city: string;
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

function firstValue(
  value: string | string[] | undefined,
) {
  return (
    Array.isArray(value)
      ? value[0]
      : value
  )?.trim() ?? "";
}

export function normalizePublisherAuthorDiscoveryFilters(
  input: Record<
    string,
    string | string[] | undefined
  >,
): PublisherAuthorDiscoveryFilters {
  const requestedPage = Number.parseInt(
    firstValue(input.sayfa),
    10,
  );

  return {
    city:
      firstValue(input.sehir).slice(0, 120),
    genre:
      firstValue(input.tur).slice(0, 120),
    page:
      Number.isFinite(requestedPage) &&
      requestedPage > 0
        ? requestedPage
        : 1,
    query:
      firstValue(input.arama).slice(0, 220),
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
  const username =
    writer.username?.trim();

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
        (item): item is string =>
          typeof item === "string",
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
  publishedAt: {
    not: null,
  },
  status: "published",
  visibility: "public",
} satisfies Prisma.WorkWhereInput;

export async function getPublisherAuthorDiscovery(
  filters: PublisherAuthorDiscoveryFilters,
): Promise<PublisherAuthorDiscoveryData> {
  const conditions: Prisma.UserWhereInput[] = [];

  if (filters.query) {
    conditions.push({
      OR: [
        {
          displayName: {
            contains: filters.query,
          },
        },
        {
          username: {
            contains: filters.query,
          },
        },
        {
          bio: {
            contains: filters.query,
          },
        },
        {
          publicId: {
            contains: filters.query,
          },
        },
        {
          works: {
            some: {
              ...publicWorkWhere,
              title: {
                contains: filters.query,
              },
            },
          },
        },
      ],
    });
  }

  if (filters.genre) {
    conditions.push({
      OR: [
        {
          profile: {
            is: {
              writingGenres: {
                contains: filters.genre,
              },
            },
          },
        },
        {
          works: {
            some: {
              ...publicWorkWhere,
              genre: {
                contains: filters.genre,
              },
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
          city: {
            contains: filters.city,
          },
        },
      },
    });
  }

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    role: "writer",
    status: "active",
    works: {
      some: publicWorkWhere,
    },
    ...(conditions.length > 0
      ? {
          AND: conditions,
        }
      : {}),
  };

  const totalCount =
    await prisma.user.count({ where });
  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PAGE_SIZE),
  );
  const currentPage = Math.min(
    filters.page,
    totalPages,
  );

  const authors = await prisma.user.findMany({
    where,
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    skip:
      (currentPage - 1) *
      PAGE_SIZE,
    take:
      PAGE_SIZE,
    select: {
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
    },
  });

  const publicWorks =
    authors.length === 0
      ? []
      : await prisma.work.findMany({
          where: {
            ...publicWorkWhere,
            authorId: {
              in: authors.map(
                (author) => author.id,
              ),
            },
          },
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
              },
              orderBy: {
                position: "asc",
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
          },
        });

  const worksByAuthor =
    new Map<
      string,
      typeof publicWorks
    >();

  for (const work of publicWorks) {
    const current =
      worksByAuthor.get(work.authorId) ?? [];

    current.push(work);
    worksByAuthor.set(
      work.authorId,
      current,
    );
  }

  const first =
    totalCount === 0
      ? 0
      : (currentPage - 1) *
          PAGE_SIZE +
        1;
  const last = Math.min(
    currentPage * PAGE_SIZE,
    totalCount,
  );

  return {
    currentPage,
    first,
    last,
    rows: authors.map((author) => {
      const works =
        worksByAuthor.get(author.id) ?? [];
      const completedWorkCount =
        works.filter((work) => {
          const publishedChapterCount =
            work.chapters.filter(
              (chapter) =>
                chapter.status === "published" &&
                chapter.publishedAt !== null,
            ).length;
          const hasPendingChapter =
            work.chapters.some(
              (chapter) =>
                chapter.status !== "published" ||
                chapter.publishedAt === null,
            );

          return (
            publishedChapterCount > 0 &&
            !hasPendingChapter
          );
        }).length;

      return {
        alias:
          publicWriterAlias(author),
        bio:
          author.bio,
        city:
          author.profile?.city ?? null,
        commentCount:
          works.reduce(
            (total, work) =>
              total + work._count.comments,
            0,
          ),
        completedWorkCount,
        favoriteCount:
          works.reduce(
            (total, work) =>
              total + work._count.favorites,
            0,
          ),
        genres:
          parseGenres(
            author.profile?.writingGenres ??
              null,
          ),
        id:
          author.id,
        latestWorks:
          works.slice(0, 3).map((work) => ({
            chapterCount:
              work.chapters.filter(
                (chapter) =>
                  chapter.status ===
                    "published" &&
                  chapter.publishedAt !== null,
              ).length,
            commentCount:
              work._count.comments,
            favoriteCount:
              work._count.favorites,
            genre:
              work.genre,
            id:
              work.id,
            publishedAt:
              work.publishedAt?.toISOString() ??
              new Date(0).toISOString(),
            readerCount:
              work._count.readingProgress,
            slug:
              work.slug,
            title:
              work.title,
          })),
        name:
          publicWriterName(author),
        publicId:
          author.publicId,
        publicWorkCount:
          works.length,
        readerCount:
          works.reduce(
            (total, work) =>
              total +
              work._count.readingProgress,
            0,
          ),
        reviewedWorkCount:
          works.filter(
            (work) =>
              work.editorReviewStatus ===
              "completed",
          ).length,
      };
    }),
    totalCount,
    totalPages,
  };
}
