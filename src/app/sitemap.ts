import type { MetadataRoute } from "next";
import { editors } from "@/features/editors/data";
import { prisma } from "@/lib/prisma";
import { isBlockedPublicWorkSlug } from "@/lib/public-content-safety";

const baseUrl = "https://ilkoku.com";
const legalSlugs = ["kullanim-sartlari", "gizlilik-politikasi", "kvkk", "cerez-politikasi", "telif-hakki-politikasi"] as const;
type CmsSitemapRow = { slug: string; updatedAt: Date };
type CmsLegalSitemapRow = CmsSitemapRow & { noIndex: boolean };

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const safeStaticEntries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/yardim`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/editorler`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/rehber`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ...editors.map((editor) => ({
      url: `${baseUrl}/editorler/${editor.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  try {
    const [works, guides, pages, legalRows] = await Promise.all([
      prisma.work.findMany({
        where: { archivedAt: null, publishedAt: { not: null }, status: "published", visibility: "public" },
        orderBy: { updatedAt: "desc" },
        select: { slug: true, updatedAt: true },
        take: 50000,
      }),
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

    const legalBySlug = new Map(legalRows.map((row) => [row.slug, row]));
    const legalEntries: MetadataRoute.Sitemap = legalSlugs.flatMap((slug) => {
      const path = `/yasal/${slug}`;
      const row = legalBySlug.get(path);
      if (row?.noIndex) return [];
      return [{
        url: `${baseUrl}${path}`,
        lastModified: row?.updatedAt ?? now,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      }];
    });

    return [
      ...safeStaticEntries,
      ...legalEntries,
      ...works
        .filter((work) => !isBlockedPublicWorkSlug(work.slug))
        .map((work) => ({ url: `${baseUrl}/kitap/${work.slug}`, lastModified: work.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
      ...guides.map((guide) => ({ url: `${baseUrl}${guide.slug}`, lastModified: guide.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
      ...pages.map((page) => ({ url: `${baseUrl}${page.slug}`, lastModified: page.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    ];
  } catch {
    // CMS indexability cannot be verified: omit CMS-managed legal/content routes rather than emitting stale contradictory signals.
    return safeStaticEntries;
  }
}
