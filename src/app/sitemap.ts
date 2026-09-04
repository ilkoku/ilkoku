import type { MetadataRoute } from "next";

import { aboutPageContent } from "@/content/about";
import { communityRulesPageContent } from "@/content/community-rules";
import { copyrightNoticePageContent } from "@/content/copyright-notice";
import { editorialStandardsPageContent } from "@/content/editorial-standards";
import { forEditorsPageContent } from "@/content/for-editors";
import { forPublishersPageContent } from "@/content/for-publishers";
import { forWritersPageContent } from "@/content/for-writers";
import { contentAgePolicyPageContent } from "@/content/content-age-policy";
import { howItWorksPageContent } from "@/content/how-it-works";
import {
  getPublicAuthors,
  getPublicGenres,
} from "@/features/public-discovery/library";
import { prisma } from "@/lib/prisma";
import { isBlockedPublicWorkSlug } from "@/lib/public-content-safety";
import { publicDiscoveryEnabled } from "@/lib/public-site-navigation";

const baseUrl = "https://ilkoku.com";
const legalSlugs = [
  "kullanim-sartlari",
  "gizlilik-politikasi",
  "kvkk",
  "cerez-politikasi",
  "telif-hakki-politikasi",
] as const;

const bundledPublicPages = [
  {
    canonical: "/hakkimizda",
    url: `${baseUrl}/hakkimizda`,
    updatedAt: aboutPageContent.updatedAt,
    priority: 0.8,
  },
  {
    canonical: "/nasil-calisir",
    url: `${baseUrl}/nasil-calisir`,
    updatedAt: howItWorksPageContent.updatedAt,
    priority: 0.8,
  },
  {
    canonical: "/editoryal-standartlar",
    url: `${baseUrl}/editoryal-standartlar`,
    updatedAt: editorialStandardsPageContent.updatedAt,
    priority: 0.75,
  },
  {
    canonical: "/icerik-ve-yas-politikasi",
    url: `${baseUrl}/icerik-ve-yas-politikasi`,
    updatedAt: contentAgePolicyPageContent.updatedAt,
    priority: 0.75,
  },
  {
    canonical: "/topluluk-kurallari",
    url: `${baseUrl}/topluluk-kurallari`,
    updatedAt: communityRulesPageContent.updatedAt,
    priority: 0.75,
  },
  {
    canonical: "/telif-bildirimi",
    url: `${baseUrl}/telif-bildirimi`,
    updatedAt: copyrightNoticePageContent.updatedAt,
    priority: 0.75,
  },
  {
    canonical: "/yazarlar-icin",
    url: `${baseUrl}/yazarlar-icin`,
    updatedAt: forWritersPageContent.updatedAt,
    priority: 0.8,
  },
  {
    canonical: "/editorler-icin",
    url: `${baseUrl}/editorler-icin`,
    updatedAt: forEditorsPageContent.updatedAt,
    priority: 0.8,
  },
  {
    canonical: "/yayinevleri-icin",
    url: `${baseUrl}/yayinevleri-icin`,
    updatedAt: forPublishersPageContent.updatedAt,
    priority: 0.8,
  },
] as const;

const staticCmsPageSlugs = new Set<string>(
  bundledPublicPages.map((page) => page.canonical),
);

const publicDiscoveryStaticEntries: MetadataRoute.Sitemap = [
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
];

const staticDiscoveryEntries: MetadataRoute.Sitemap = [
  {
    url: `${baseUrl}/`,
    changeFrequency: "daily",
    priority: 1,
  },
  ...(publicDiscoveryEnabled ? publicDiscoveryStaticEntries : []),
  {
    url: `${baseUrl}/yardim`,
    changeFrequency: "weekly",
    priority: 0.6,
  },
  {
    url: `${baseUrl}/editorler`,
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    url: `${baseUrl}/iletisim`,
    changeFrequency: "monthly",
    priority: 0.6,
  },
];

const staticFallbackEntries: MetadataRoute.Sitemap = [
  ...staticDiscoveryEntries,
  ...bundledPublicPages.map((page) => ({
    url: page.url,
    lastModified: new Date(page.updatedAt),
    changeFrequency: "monthly" as const,
    priority: page.priority,
  })),
  ...legalSlugs.map((slug) => ({
    url: `${baseUrl}/yasal/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.4,
  })),
];

type CmsSitemapRow = {
  slug: string;
  noIndex: boolean;
  updatedAt: Date;
};

type CmsLegalSitemapRow = CmsSitemapRow;

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
          contentRating: {
            not: "adult_18",
          },
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
      publicDiscoveryEnabled ? getPublicAuthors() : Promise.resolve([]),
      publicDiscoveryEnabled ? getPublicGenres() : Promise.resolve([]),
      prisma.$queryRaw<CmsSitemapRow[]>`
        SELECT slug, noIndex, updatedAt
        FROM ContentPage
        WHERE contentKey LIKE 'page:tr:%'
          AND status = 'published'
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

    const pageBySlug = new Map(
      pages.map((row) => [row.slug, row]),
    );
    const publicPageEntries: MetadataRoute.Sitemap = bundledPublicPages.flatMap((page) => {
      const row = pageBySlug.get(page.canonical);

      if (row?.noIndex) {
        return [];
      }

      return [{
        url: page.url,
        lastModified: row?.updatedAt ?? new Date(page.updatedAt),
        changeFrequency: "monthly" as const,
        priority: page.priority,
      }];
    });

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
      ...staticDiscoveryEntries,
      ...publicPageEntries,
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
        .filter((page) => !page.noIndex && !staticCmsPageSlugs.has(page.slug))
        .map((page) => ({
          url: `${baseUrl}${page.slug}`,
          lastModified: page.updatedAt,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        })),
    ];
  } catch {
    // Search engines must keep seeing the currently enabled code-owned public
    // surface even when CMS/database lookups are temporarily unavailable.
    // Dynamic author, genre, work and CMS-owned URLs fail closed.
    return staticFallbackEntries;
  }
}
