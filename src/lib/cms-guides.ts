import "server-only";

import { defaultCmsLocale, type CmsLocaleCode } from "@/lib/cms-locales";
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

export function cmsGuideContentKey(slugPart: string, locale: CmsLocaleCode) {
  const clean = normalizeGuideSlug(slugPart);
  if (locale === defaultCmsLocale) return `guide:${clean}`;
  return `guide:${locale}:${clean}`;
}

export function cmsGuidePublicPath(slugPart: string, locale: CmsLocaleCode) {
  const clean = normalizeGuideSlug(slugPart);
  if (locale === defaultCmsLocale) return `/rehber/${clean}`;
  return `/${locale}/rehber/${clean}`;
}

export function cmsGuideContentPattern(locale: CmsLocaleCode) {
  return locale === defaultCmsLocale ? "guide:%" : `guide:${locale}:%`;
}

export function cmsGuideLocaleFromContentKey(contentKey: string): CmsLocaleCode {
  return contentKey.startsWith("guide:en:") ? "en" : defaultCmsLocale;
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

export async function getPublishedGuideBySlug(slugPart: string, locale: CmsLocaleCode = defaultCmsLocale) {
  const fullSlug = cmsGuidePublicPath(slugPart, locale);
  if (fullSlug.endsWith("/rehber/")) return null;
  const contentKey = cmsGuideContentKey(slugPart, locale);

  try {
    const rows = await prisma.$queryRaw<PublishedGuide[]>`
      SELECT id, slug, title, bodyJson, seoTitle, seoDescription, canonicalUrl,
             noIndex, publishedAt, updatedAt
      FROM ContentPage
      WHERE slug = ${fullSlug}
        AND status = 'published'
        AND contentKey = ${contentKey}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
