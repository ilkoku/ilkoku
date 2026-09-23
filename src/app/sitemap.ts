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
import { EDITOR_EDUCATION_CATEGORIES, editorEducationPublicPath } from "@/lib/editor-education";
import { GENRES } from "@/lib/genres";
import { prisma } from "@/lib/prisma";
import { isSearchIndexExcludedPublicWorkSlug } from "@/lib/public-content-safety";
import { publicTaxonomySlug } from "@/lib/public-taxonomy";
import { READER_EDUCATION_CATEGORIES, readerEducationPublicPath } from "@/lib/reader-education";
import { WRITING_CATEGORY_HUBS } from "@/lib/writing-category-hubs";

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

const writingCategoryHrefByCategory = new Map(
  WRITING_CATEGORY_HUBS.map((hub) => [hub.category, hub.href] as const),
);

const writingGenreHrefs = GENRES.map((genre) => {
  const categoryHref = writingCategoryHrefByCategory.get(genre.category);
  if (!categoryHref) {
    throw new Error(`Missing writing category hub for ${genre.category}`);
  }
  return `${categoryHref}/${genre.slug}`;
});

const writingEducationEntries: MetadataRoute.Sitemap = [
  ...WRITING_CATEGORY_HUBS.map((hub) => ({
    url: `${baseUrl}${hub.href}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  })),
  ...writingGenreHrefs.map((href) => ({
    url: `${baseUrl}${href}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  })),
];

const readerEducationHrefs = READER_EDUCATION_CATEGORIES.map((category) => readerEducationPublicPath(category));

const readerEducationEntries: MetadataRoute.Sitemap = readerEducationHrefs.map((href) => ({
  url: `${baseUrl}${href}`,
  changeFrequency: "monthly" as const,
  priority: 0.7,
}));

const editorEducationHrefs = EDITOR_EDUCATION_CATEGORIES.map((category) => editorEducationPublicPath(category));

const editorEducationEntries: MetadataRoute.Sitemap = editorEducationHrefs.map((href) => ({
  url: `${baseUrl}${href}`,
  changeFrequency: "monthly" as const,
  priority: 0.7,
}));

const staticCmsPageSlugs = new Set<string>([
  ...bundledPublicPages.map((page) => page.canonical),
  ...WRITING_CATEGORY_HUBS.map((hub) => hub.href),
  ...writingGenreHrefs,
  ...readerEducationHrefs,
  ...editorEducationHrefs,
  "/site-haritasi",
]);

const staticDiscoveryEntries: MetadataRoute.Sitemap = [
  {
    url: `${baseUrl}/`,
    changeFrequency: "daily",
    priority: 1,
  },
  ...writingEducationEntries,
  ...readerEducationEntries,
  ...editorEducationEntries,
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
    url: `${baseUrl}/eserler`,
    changeFrequency: "daily",
    priority: 0.85,
  },
  {
    url: `${baseUrl}/eserler/yeni`,
    changeFrequency: "daily",
    priority: 0.75,
  },
  {
    url: `${baseUrl}/eserler/guncellenen`,
    changeFrequency: "daily",
    priority: 0.75,
  },
  {
    url: `${baseUrl}/yazarlar`,
    changeFrequency: "daily",
    priority: 0.8,
  },
  {
    url: `${baseUrl}/turler`,
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    url: `${baseUrl}/iletisim`,
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${baseUrl}/site-haritasi`,
    changeFrequency: "weekly",
    priority: 0.7,
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
          isActive: true,
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
          genre: true,
          updatedAt: true,
          author: {
            select: {
              publicId: true,
            },
          },
        },
        take: 50_000,
      }),
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
    const publicPageEntries: MetadataRoute.Sitemap = bundledPublicPages.map((page) => {
      const row = pageBySlug.get(page.canonical);

      return {
        url: page.url,
        lastModified: row?.updatedAt ?? new Date(page.updatedAt),
        changeFrequency: "monthly" as const,
        priority: page.priority,
      };
    });

    const legalBySlug = new Map(
      legalRows.map((row) => [row.slug, row]),
    );
    const legalEntries: MetadataRoute.Sitemap =
      legalSlugs.map((slug) => {
        const path = `/yasal/${slug}`;
        const row = legalBySlug.get(path);

        return {
          url: `${baseUrl}${path}`,
          ...(row
            ? {
                lastModified: row.updatedAt,
              }
            : {}),
          changeFrequency: "monthly" as const,
          priority: 0.4,
        };
      });

    const searchableWorks = works.filter(
      (work) => !isSearchIndexExcludedPublicWorkSlug(work.slug),
    );

    const authorUpdatedAt = new Map<string, Date>();
    const genreUpdatedAt = new Map<string, Date>();

    for (const work of searchableWorks) {
      const authorId = work.author.publicId;
      const currentAuthorDate = authorUpdatedAt.get(authorId);
      if (!currentAuthorDate || work.updatedAt > currentAuthorDate) {
        authorUpdatedAt.set(authorId, work.updatedAt);
      }

      const genre = work.genre?.trim();
      if (genre) {
        const genreSlug = publicTaxonomySlug(genre);
        const currentGenreDate = genreUpdatedAt.get(genreSlug);
        if (!currentGenreDate || work.updatedAt > currentGenreDate) {
          genreUpdatedAt.set(genreSlug, work.updatedAt);
        }
      }
    }

    const authorEntries: MetadataRoute.Sitemap = [...authorUpdatedAt.entries()].map(
      ([publicId, lastModified]) => ({
        url: `${baseUrl}/yazarlar/${publicId}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }),
    );

    const genreEntries: MetadataRoute.Sitemap = [...genreUpdatedAt.entries()].map(
      ([slug, lastModified]) => ({
        url: `${baseUrl}/turler/${slug}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }),
    );

    return [
      ...staticDiscoveryEntries,
      ...publicPageEntries,
      ...legalEntries,
      ...authorEntries,
      ...genreEntries,
      ...searchableWorks.map((work) => ({
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
