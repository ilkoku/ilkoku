from pathlib import Path
import re

# 1) Canonical host: force www -> apex.
p = Path("next.config.ts")
s = p.read_text()
old = '''  async redirects() {
    return [
      {
        source: "/admin",'''
new = '''  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.ilkoku.com",
          },
        ],
        destination: "https://ilkoku.com/:path*",
        permanent: true,
      },
      {
        source: "/admin",'''
if old not in s:
    raise SystemExit("next.config redirect anchor not found")
p.write_text(s.replace(old, new, 1))

# 2) Eserler social image metadata.
p = Path("src/app/eserler/page.tsx")
s = p.read_text()
anchor = '''const pageDescription =
  "İlkOku'da keşfe açık Türkçe eser vitrinlerini tür, yazar ve güncellik bilgileriyle keşfedin.";
'''
if anchor not in s:
    raise SystemExit("eserler description anchor not found")
s = s.replace(anchor, anchor + 'const socialImage = "/opengraph-image";\n', 1)
og = '''      title: pageTitle,
      description: pageDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
    },'''
og_new = '''      title: pageTitle,
      description: pageDescription,
      images: [{ url: socialImage, alt: "İlkOku eser keşfi" }],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [socialImage],
    },'''
if og not in s:
    raise SystemExit("eserler social metadata anchor not found")
p.write_text(s.replace(og, og_new, 1))

# 3) Avoid production MySQL contains failures on public search routes.
p = Path("src/features/public-discovery/library.ts")
s = p.read_text()

work_fn = r'''export async function getPublicWorkLibrary\(.*?\n}\n\nexport async function getPublicGenres'''
work_replacement = '''export async function getPublicWorkLibrary(
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
        },
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

export async function getPublicGenres'''
s2, n = re.subn(work_fn, work_replacement, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit(f"getPublicWorkLibrary replacement count={n}")
s = s2

genres_fn = r'''export async function getPublicGenres\(search\?: string\) \{.*?\n}\n\nexport async function getPublicGenreBySlug'''
genres_replacement = '''export async function getPublicGenres(search?: string) {
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

export async function getPublicGenreBySlug'''
s2, n = re.subn(genres_fn, genres_replacement, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit(f"getPublicGenres replacement count={n}")
s = s2

authors_fn = r'''export async function getPublicAuthors\(search\?: string\) \{.*?\n}\n\nexport async function getPublicAuthorById'''
authors_replacement = '''export async function getPublicAuthors(search?: string) {
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

export async function getPublicAuthorById'''
s2, n = re.subn(authors_fn, authors_replacement, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit(f"getPublicAuthors replacement count={n}")
p.write_text(s2)
