import "server-only";

import { prisma } from "@/lib/prisma";
import {
  EDITOR_EDUCATION_CATEGORIES,
  EDITOR_EDUCATION_VISUAL_SLOTS,
  getEditorEducationCategory,
  type EditorEducationCategory,
  type EditorEducationVisualFit,
  type EditorEducationVisualSlotKey,
} from "@/lib/editor-education";
import type { EditorEducationTextOverrides } from "@/lib/editor-education-text";

export const EDITOR_EDUCATION_GUIDE_NAMESPACE = "editor_education_guide";
export const EDITOR_EDUCATION_TEXT_NAMESPACE = "editor_education_text";
export const EDITOR_EDUCATION_TEXT_DRAFT_NAMESPACE = "editor_education_text_draft";
export const EDITOR_EDUCATION_TEXT_REVISION_NAMESPACE = "editor_education_text_revision";
export const EDITOR_EDUCATION_GITHUB_MEDIA_ROOT = "public/media/editor-education";

export type EditorEducationVisual = {
  url: string;
  altText: string;
  filename?: string;
  mediaId?: string;
  sourceWidth?: number;
  sourceHeight?: number;
  recommendedWidth: number;
  recommendedHeight: number;
  aspectRatio: string;
  fit: EditorEducationVisualFit;
  folder: string;
};

export type EditorEducationGuideRecord = {
  categorySlug: string;
  visuals: Partial<Record<EditorEducationVisualSlotKey, EditorEducationVisual>>;
};

export type EditorEducationTextRecord = {
  categorySlug: string;
  version: number;
  overrides: EditorEducationTextOverrides;
  savedAt?: string;
};

export type EditorEducationTextRevision = EditorEducationTextRecord & {
  contentKey: string;
  createdAt: Date;
};

type EditorEducationGuideRow = {
  contentKey: string;
  valueJson: string;
  updatedAt: Date;
};

type EditorEducationTextRow = {
  contentKey: string;
  valueJson: string;
  createdAt: Date;
  updatedAt: Date;
};

export function editorEducationMediaFolder(category: Pick<EditorEducationCategory, "slug">) {
  return `editor-education/${category.slug}`;
}

export function editorEducationGithubMediaFolder(category: Pick<EditorEducationCategory, "slug">) {
  return `${EDITOR_EDUCATION_GITHUB_MEDIA_ROOT}/${category.slug}`;
}

export function editorEducationGuideDefault(category: EditorEducationCategory): EditorEducationGuideRecord {
  return {
    categorySlug: category.slug,
    visuals: {},
  };
}

export function editorEducationTextDefault(category: EditorEducationCategory): EditorEducationTextRecord {
  return {
    categorySlug: category.slug,
    version: 0,
    overrides: {},
  };
}

function safePositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 20000 ? value : undefined;
}

function safeVersion(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1000000 ? value : 0;
}

function safeOverrides(value: unknown): EditorEducationTextOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: EditorEducationTextOverrides = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!/^t-[a-zA-Z0-9-]+$/.test(key)) continue;
    if (typeof raw !== "string") continue;
    const text = raw.trim().slice(0, 12000);
    if (text) result[key] = text;
  }
  return result;
}

function safeVisual(
  value: unknown,
  slot: (typeof EDITOR_EDUCATION_VISUAL_SLOTS)[number],
  category: EditorEducationCategory,
): EditorEducationVisual | null {
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
    folder: editorEducationMediaFolder(category),
  };
}

export function parseEditorEducationGuide(valueJson: string, category: EditorEducationCategory): EditorEducationGuideRecord {
  const fallback = editorEducationGuideDefault(category);

  try {
    const parsed = JSON.parse(valueJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
    const raw = parsed as Record<string, unknown>;
    const visualsRaw = raw.visuals && typeof raw.visuals === "object" && !Array.isArray(raw.visuals)
      ? raw.visuals as Record<string, unknown>
      : {};
    const visuals: EditorEducationGuideRecord["visuals"] = {};

    for (const slot of EDITOR_EDUCATION_VISUAL_SLOTS) {
      const visual = safeVisual(visualsRaw[slot.key], slot, category);
      if (visual) visuals[slot.key] = visual;
    }

    return { categorySlug: category.slug, visuals };
  } catch {
    return fallback;
  }
}

export function parseEditorEducationText(valueJson: string, category: EditorEducationCategory): EditorEducationTextRecord {
  const fallback = editorEducationTextDefault(category);
  try {
    const parsed = JSON.parse(valueJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
    const raw = parsed as Record<string, unknown>;
    return {
      categorySlug: category.slug,
      version: safeVersion(raw.version),
      overrides: safeOverrides(raw.overrides),
      savedAt: typeof raw.savedAt === "string" ? raw.savedAt.slice(0, 80) : undefined,
    };
  } catch {
    return fallback;
  }
}

export async function getEditorEducationGuideRecord(categorySlug: string) {
  const category = getEditorEducationCategory(categorySlug);
  if (!category) return null;

  const rows = await prisma.$queryRaw<EditorEducationGuideRow[]>`
    SELECT contentKey, valueJson, updatedAt
    FROM SiteContent
    WHERE namespace = ${EDITOR_EDUCATION_GUIDE_NAMESPACE}
      AND contentKey = ${category.slug}
      AND status = 'published'
    LIMIT 1
  `;

  return rows[0] ? parseEditorEducationGuide(rows[0].valueJson, category) : editorEducationGuideDefault(category);
}

async function getEditorEducationTextRow(
  namespace: string,
  categorySlug: string,
  status: "draft" | "published",
) {
  const rows = await prisma.$queryRaw<EditorEducationTextRow[]>`
    SELECT contentKey, valueJson, createdAt, updatedAt
    FROM SiteContent
    WHERE namespace = ${namespace}
      AND contentKey = ${categorySlug}
      AND status = ${status}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getEditorEducationPublishedTextRecord(categorySlug: string) {
  const category = getEditorEducationCategory(categorySlug);
  if (!category) return null;
  const row = await getEditorEducationTextRow(EDITOR_EDUCATION_TEXT_NAMESPACE, category.slug, "published");
  return row ? parseEditorEducationText(row.valueJson, category) : editorEducationTextDefault(category);
}

export async function getEditorEducationDraftTextRecord(categorySlug: string) {
  const category = getEditorEducationCategory(categorySlug);
  if (!category) return null;
  const row = await getEditorEducationTextRow(EDITOR_EDUCATION_TEXT_DRAFT_NAMESPACE, category.slug, "draft");
  return row ? parseEditorEducationText(row.valueJson, category) : null;
}

export async function listEditorEducationTextRevisions(categorySlug: string, limit = 12) {
  const category = getEditorEducationCategory(categorySlug);
  if (!category) return [];
  const pattern = `${category.slug}:%`;
  const safeLimit = Math.max(1, Math.min(40, Math.trunc(limit)));
  const rows = await prisma.$queryRaw<EditorEducationTextRow[]>`
    SELECT contentKey, valueJson, createdAt, updatedAt
    FROM SiteContent
    WHERE namespace = ${EDITOR_EDUCATION_TEXT_REVISION_NAMESPACE}
      AND contentKey LIKE ${pattern}
      AND status = 'published'
    ORDER BY createdAt DESC
    LIMIT 40
  `;
  return rows.slice(0, safeLimit).map((row) => ({
    ...parseEditorEducationText(row.valueJson, category),
    contentKey: row.contentKey,
    createdAt: row.createdAt,
  } satisfies EditorEducationTextRevision));
}

export async function listEditorEducationGuideRecords() {
  const rows = await prisma.$queryRaw<EditorEducationGuideRow[]>`
    SELECT contentKey, valueJson, updatedAt
    FROM SiteContent
    WHERE namespace = ${EDITOR_EDUCATION_GUIDE_NAMESPACE}
      AND status = 'published'
    ORDER BY updatedAt DESC
  `;
  const bySlug = new Map(rows.map((row) => [row.contentKey, row]));

  return EDITOR_EDUCATION_CATEGORIES.map((category) => {
    const row = bySlug.get(category.slug);
    const guide = row ? parseEditorEducationGuide(row.valueJson, category) : editorEducationGuideDefault(category);
    return { category, guide, updatedAt: row?.updatedAt ?? null };
  });
}

export function isEditorEducationVisualSlotKey(value: string): value is EditorEducationVisualSlotKey {
  return EDITOR_EDUCATION_VISUAL_SLOTS.some((slot) => slot.key === value);
}
