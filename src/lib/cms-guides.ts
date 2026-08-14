import "server-only";

import { prisma } from "@/lib/prisma";

export type CmsGuideBody = {
  summary?: string;
  body?: string;
};

export type PublishedGuide = {
  id: string;
  slug: string;
  title: string;
  bodyJson: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
};

export function normalizeGuideSlug(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[ç]/g, "c")
    .replace(/[ğ]/g, "g")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ş]/g, "s")
    .replace(/[ü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function parseGuideBody(value: string): CmsGuideBody {
  try {
    const parsed = JSON.parse(value) as CmsGuideBody;
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      body: typeof parsed.body === "string" ? parsed.body : "",
    };
  } catch {
    return { summary: "", body: "" };
  }
}

export async function getPublishedGuideBySlug(slugPart: string) {
  const fullSlug = `/rehber/${normalizeGuideSlug(slugPart)}`;
  if (fullSlug === "/rehber/") return null;

  try {
    const rows = await prisma.$queryRaw<PublishedGuide[]>`
      SELECT id, slug, title, bodyJson, seoTitle, seoDescription, canonicalUrl,
             noIndex, publishedAt, updatedAt
      FROM ContentPage
      WHERE slug = ${fullSlug}
        AND status = 'published'
        AND contentKey LIKE 'guide:%'
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
