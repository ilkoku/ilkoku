import "server-only";

import { parseCmsPageBody } from "@/lib/cms-pages";
import { prisma } from "@/lib/prisma";

type PublicPageRow = {
  bodyJson: string;
  canonicalUrl: string | null;
  noIndex: boolean;
  seoDescription: string | null;
  seoTitle: string | null;
  title: string;
  updatedAt: Date;
};

export type PublishedCmsPublicPage = {
  body: string;
  canonicalUrl: string | null;
  noIndex: boolean;
  seoDescription: string | null;
  seoTitle: string | null;
  summary: string;
  title: string;
  updatedAt: Date;
};

export type PublishedCmsPublicPageState =
  | { state: "missing" }
  | { state: "valid"; page: PublishedCmsPublicPage }
  | { state: "corrupt"; updatedAt: Date }
  | { state: "unavailable" };

export async function getPublishedCmsPublicPageState(
  slugPart: string,
): Promise<PublishedCmsPublicPageState> {
  const contentKey = `page:tr:${slugPart}`;
  const slug = `/${slugPart}`;

  try {
    const rows = await prisma.$queryRaw<PublicPageRow[]>`
      SELECT title, bodyJson, seoTitle, seoDescription, canonicalUrl, noIndex, updatedAt
      FROM ContentPage
      WHERE contentKey = ${contentKey}
        AND slug = ${slug}
        AND status = 'published'
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return { state: "missing" };

    const parsed = parseCmsPageBody(row.bodyJson);
    if (!row.title.trim() || !parsed.body.trim()) {
      return { state: "corrupt", updatedAt: row.updatedAt };
    }

    return {
      state: "valid",
      page: {
        body: parsed.body.trim(),
        canonicalUrl: row.canonicalUrl,
        noIndex: row.noIndex,
        seoDescription: row.seoDescription,
        seoTitle: row.seoTitle,
        summary: parsed.summary.trim(),
        title: row.title.trim(),
        updatedAt: row.updatedAt,
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}
