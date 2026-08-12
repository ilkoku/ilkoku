import type { MetadataRoute } from "next";
import { editors } from "@/features/editors/data";
import { prisma } from "@/lib/prisma";

const baseUrl = "https://ilkoku.com";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/editorler`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...[
      "kullanim-sartlari",
      "gizlilik-politikasi",
      "kvkk",
      "cerez-politikasi",
      "telif-hakki-politikasi",
    ].map((slug) => ({
      url: `${baseUrl}/yasal/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
    ...editors.map((editor) => ({
      url: `${baseUrl}/editorler/${editor.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  try {
    const works = await prisma.work.findMany({
      where: {
        archivedAt: null,
        publishedAt: { not: null },
        status: "published",
        visibility: "public",
      },
      orderBy: { updatedAt: "desc" },
      select: {
        slug: true,
        updatedAt: true,
      },
      take: 50000,
    });

    return [
      ...staticEntries,
      ...works.map((work) => ({
        url: `${baseUrl}/kitap/${work.slug}`,
        lastModified: work.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticEntries;
  }
}
