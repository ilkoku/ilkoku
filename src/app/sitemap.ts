import type { MetadataRoute } from "next";

import { foundationalGuides } from "@/content/public-guides";
import {
  getPublicAuthors,
  getPublicGenres,
} from "@/features/public-discovery/library";
import { prisma } from "@/lib/prisma";
import { isBlockedPublicWorkSlug } from "@/lib/public-content-safety";

const baseUrl = "https://ilkoku.com";
const legalSlugs = [
  "kullanim-sartlari",
  "gizlilik-politikasi",
  "kvkk",
  "cerez-politikasi",
  "telif-hakki-politikasi",
] as const;

type CmsSitemapRow = {
  slug: string;
  updatedAt: Date;
};

type CmsLegalSitemapRow = CmsSitemapRow & {
  noIndex: boolean;
};

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const foundationalEntries: MetadataRoute.Sitemap =
    foundationalGuides.map((guide) => ({
      url: `${baseUrl}/rehber/${guide.slug}`,
      lastModified: new Date(guide.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.65,
    }));
  const foundationalPaths = new Set(
    foundationalGuides.map(
      (guide) => `/rehber/${guide.slug}`,
    ),
  );
  const safeStaticEntries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/eserler`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/eserler/yeni`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/eserler/guncellenen`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/yazarlar`,
      changeFrequency: "daily",
      priority: 0.75,
    },
    {
      url: `${baseUrl}/turler`,
      changeFrequency: "daily",
      priority: 0.75,
    },
    {
      url: `${baseUrl}/yardim`,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/editorler`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/rehber`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...foundationalEntries,
  ];

  try {
    const [
      works,
      authors,
      genres,
      guides,
      pages,
      legalRows,
    ] = await Promise.all([
      prisma.work.findMany({
        where: {
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
          status: "published",
          visibility: "public",
        },
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          slug: true,
          updatedAt: true,
        },
        take: 50_000,
      }),
      getPublicAuthors(),
      getPublicGenres(),
      prisma.$queryRaw<CmsSitemapRow[]>`
        SELECT slug, updatedAt
        FROM ContentPage
        WHERE contentKey LIKE 'guide:%'
          AND contentKey NOT LIKE 'guide:en:%'
          AND status = 'published'
          AND noIndex = false
        ORDER BY updatedAt DESC
        LIMIT 5000
      `,
      prisma.$queryRaw<CmsSitemapRow[]>`
        SELECT slug, updatedAt
        FROM ContentPage
        WHERE contentKey LIKE 'page:tr:%'
          AND status = 'published'
          AND noIndex = false
        ORDER BY updatedAt DESC
        LIMIT 5000
      `,
      prisma.$queryRaw<CmsLegalSitemapRow[]>`
        SELECT slug, noIndex, updatedAt
        FROM ContentPage
        WHERE contentKey LIKE 'legal:%'
          AND contentKey NOT LIKE 'legal:en:%'
          AND status = 'published'
        ORDER BY updatedAt DESC
        LIMIT 100
      `,
    ]);

    const legalBySlug = new Map(
      legalRows.map((row) => [row.slug, row]),
    );
    const legalEntries: MetadataRoute.Sitemap =
      legalSlugs.flatMap((slug) => {
        const path = `/yasal/${slug}`;
        const row = legalBySlug.get(path);

        if (row?.noIndex) {
          return [];
        }

        return [
          {
            url: `${baseUrl}${path}`,
            ...(row
              ? {
                  lastModified: row.updatedAt,
                }
              : {}),
            changeFrequency: "monthly" as const,
            priority: 0.4,
          },
        ];
      });

    return [
      ...safeStaticEntries,
      ...legalEntries,
      ...authors.map((author) => ({
        url: `${baseUrl}/yazarlar/${author.publicId}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...genres.map((genre) => ({
        url: `${baseUrl}/turler/${genre.slug}`,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
      ...works
        .filter(
          (work) =>
            !isBlockedPublicWorkSlug(work.slug),
        )
        .map((work) => ({
          url: `${baseUrl}/kitap/${work.slug}`,
          lastModified: work.updatedAt,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        })),
      ...guides
        .filter(
          (guide) =>
            !foundationalPaths.has(guide.slug),
        )
        .map((guide) => ({
          url: `${baseUrl}${guide.slug}`,
          lastModified: guide.updatedAt,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        })),
      ...pages.map((page) => ({
        url: `${baseUrl}${page.slug}`,
        lastModified: page.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    // Keep the stable public discovery network available even if
    // database-backed CMS indexability cannot be verified.
    return safeStaticEntries;
  }
}
