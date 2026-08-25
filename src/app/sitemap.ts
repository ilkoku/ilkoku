import type { MetadataRoute } from "next";

import { editorialStandardsPageContent } from "@/content/editorial-standards";
import { howItWorksPageContent } from "@/content/how-it-works";
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
      url: `${baseUrl}/nasil-calisir`,
      lastModified: new Date(howItWorksPageContent.updatedAt),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/editoryal-standartlar`,
      lastModified: new Date(editorialStandardsPageContent.updatedAt),
      changeFrequency: "monthly",
      priority: 0.75,
    },
  ];

  try {
    const [
      works,
      authors,
      genres,
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
      ...pages
        .filter((page) => page.slug !== howItWorksPageContent.canonical)
        .map((page) => ({
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
