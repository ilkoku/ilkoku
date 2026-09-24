import "server-only";

import { prisma } from "@/lib/prisma";
import {
  READER_EDUCATION_CATEGORIES,
  READER_EDUCATION_VISUAL_SLOTS,
  getReaderEducationCategory,
  readerEducationPublicPath,
  type ReaderEducationCategory,
  type ReaderEducationVisualFit,
  type ReaderEducationVisualSlotKey,
} from "@/lib/reader-education";

export const READER_EDUCATION_GUIDE_NAMESPACE = "reader_education_guide";
export const READER_EDUCATION_GITHUB_MEDIA_ROOT = "public/media/reader-education";

export type ReaderEducationVisual = {
  url: string;
  altText: string;
  filename?: string;
  mediaId?: string;
  sourceWidth?: number;
  sourceHeight?: number;
  recommendedWidth: number;
  recommendedHeight: number;
  aspectRatio: string;
  fit: ReaderEducationVisualFit;
  folder: string;
};

export type ReaderEducationGuideRecord = {
  categorySlug: string;
  title: string;
  summary: string;
  visuals: Partial<Record<ReaderEducationVisualSlotKey, ReaderEducationVisual>>;
};

type ReaderEducationGuideRow = {
  contentKey: string;
  valueJson: string;
  updatedAt: Date;
};

export function readerEducationMediaFolder(category: Pick<ReaderEducationCategory, "slug">) {
  return `reader-education/${category.slug}`;
}

export function readerEducationGithubMediaFolder(category: Pick<ReaderEducationCategory, "slug">) {
  return `${READER_EDUCATION_GITHUB_MEDIA_ROOT}/${category.slug}`;
}

export function readerEducationGuideDefault(category: ReaderEducationCategory): ReaderEducationGuideRecord {
  return {
    categorySlug: category.slug,
    title: category.title,
    summary: category.shortDescription,
    visuals: {},
  };
}

function safePositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 20000 ? value : undefined;
}

function safeVisual(
  value: unknown,
  slot: (typeof READER_EDUCATION_VISUAL_SLOTS)[number],
  category: ReaderEducationCategory,
): ReaderEducationVisual | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const url = typeof item.url === "string" ? item.url.trim() : "";
  if (!url.startsWith("/") || url.startsWith("//")) return null;

  return {
    url,
    altText: typeof item.altText === "string" ? item.altText.slice(0, 300) : "",
    filename: typeof item.filename === "string" ? item.filename.slice(0, 180) : undefined,
    mediaId: typeof item.mediaId === "string" ? item.mediaId.slice(0, 80) : undefined,
    sourceWidth: safePositiveInteger(item.sourceWidth),
    sourceHeight: safePositiveInteger(item.sourceHeight),
    recommendedWidth: slot.recommendedWidth,
    recommendedHeight: slot.recommendedHeight,
    aspectRatio: slot.aspectRatio,
    fit: slot.fit,
    folder: readerEducationMediaFolder(category),
  };
}

export function parseReaderEducationGuide(valueJson: string, category: ReaderEducationCategory): ReaderEducationGuideRecord {
  const fallback = readerEducationGuideDefault(category);

  try {
    const parsed = JSON.parse(valueJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;

    const raw = parsed as Record<string, unknown>;
    const visualsRaw = raw.visuals && typeof raw.visuals === "object" && !Array.isArray(raw.visuals)
      ? raw.visuals as Record<string, unknown>
      : {};
    const visuals: ReaderEducationGuideRecord["visuals"] = {};

    for (const slot of READER_EDUCATION_VISUAL_SLOTS) {
      const visual = safeVisual(visualsRaw[slot.key], slot, category);
      if (visual) visuals[slot.key] = visual;
    }

    return {
      categorySlug: category.slug,
      title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim().slice(0, 220) : fallback.title,
      summary: typeof raw.summary === "string" && raw.summary.trim() ? raw.summary.trim().slice(0, 1200) : fallback.summary,
      visuals,
    };
  } catch {
    return fallback;
  }
}

export async function getReaderEducationGuideRecord(categorySlug: string) {
  const category = getReaderEducationCategory(categorySlug);
  if (!category) return null;

  try {
    const rows = await prisma.$queryRaw<ReaderEducationGuideRow[]>`
      SELECT contentKey, valueJson, updatedAt
      FROM SiteContent
      WHERE namespace = ${READER_EDUCATION_GUIDE_NAMESPACE}
        AND contentKey = ${category.slug}
        AND status = 'published'
      LIMIT 1
    `;

    return rows[0] ? parseReaderEducationGuide(rows[0].valueJson, category) : readerEducationGuideDefault(category);
  } catch {
    // Reader education is public code-owned content. CMS visuals are optional,
    // so a CMS/storage failure must not make the public page unavailable.
    return readerEducationGuideDefault(category);
  }
}

export async function listReaderEducationGuideRecords() {
  const rows = await prisma.$queryRaw<ReaderEducationGuideRow[]>`
    SELECT contentKey, valueJson, updatedAt
    FROM SiteContent
    WHERE namespace = ${READER_EDUCATION_GUIDE_NAMESPACE}
      AND status = 'published'
    ORDER BY updatedAt DESC
  `;
  const bySlug = new Map(rows.map((row) => [row.contentKey, row]));

  return READER_EDUCATION_CATEGORIES.map((category) => {
    const row = bySlug.get(category.slug);
    const guide = row ? parseReaderEducationGuide(row.valueJson, category) : readerEducationGuideDefault(category);
    return { category, guide, updatedAt: row?.updatedAt ?? null };
  });
}

export function isReaderEducationVisualSlotKey(value: string): value is ReaderEducationVisualSlotKey {
  return READER_EDUCATION_VISUAL_SLOTS.some((slot) => slot.key === value);
}

export { readerEducationPublicPath };
