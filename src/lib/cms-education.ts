import "server-only";

import { GENRES, getGenreBySlug, type Genre, type GenreCategory } from "@/lib/genres";
import { prisma } from "@/lib/prisma";

export const EDUCATION_GUIDE_NAMESPACE = "education_guide";

export const EDUCATION_VISUAL_SLOTS = [
  { key: "hero", number: "01", label: "Hero", description: "Sayfanın üst ana görseli" },
  { key: "ideaFlow", number: "02", label: "Fikir Akışı", description: "Fikir / süreç / başlangıç anlatımı" },
  { key: "structure", number: "03", label: "Yapı Diyagramı", description: "Yapı, akış veya olay örgüsü diyagramı" },
  { key: "anatomy", number: "04", label: "Eser Anatomisi", description: "Bileşenler, karakter veya anatomi panosu" },
  { key: "pageSetup", number: "05", label: "Sayfa ve Yazım Ayarı", description: "Sayfa, biçim veya yazım ayarı anlatımı" },
  { key: "project", number: "06", label: "Örnek Proje", description: "Baştan sona örnek proje / çalışma akışı" },
  { key: "finalCta", number: "07", label: "Final CTA", description: "Sayfa sonu çağrı / kapanış görseli" },
] as const;

export type EducationVisualSlotKey = (typeof EDUCATION_VISUAL_SLOTS)[number]["key"];

export type EducationVisual = {
  url: string;
  altText: string;
  filename?: string;
  mediaId?: string;
};

export type EducationGuideRecord = {
  genreSlug: string;
  category: GenreCategory;
  title: string;
  summary: string;
  visuals: Partial<Record<EducationVisualSlotKey, EducationVisual>>;
};

type EducationGuideRow = {
  contentKey: string;
  valueJson: string;
  updatedAt: Date;
};

const CATEGORY_PATHS: Record<GenreCategory, string> = {
  Kurgu: "kurgu",
  Edebiyat: "edebiyat",
  "Senaryo ve Sahne": "senaryo-ve-sahne",
  Akademik: "akademik",
  Bilgilendirici: "bilgilendirici",
  "Çocuk ve Gençlik": "cocuk-ve-genclik",
  "Çizgi Anlatı": "cizgi-anlati",
};

export function educationCategoryPath(category: GenreCategory) {
  return CATEGORY_PATHS[category];
}

export function educationPublicPath(genre: Genre) {
  return `/yazarlar-icin/${educationCategoryPath(genre.category)}/${genre.slug}`;
}

export function educationGuideDefault(genre: Genre): EducationGuideRecord {
  return {
    genreSlug: genre.slug,
    category: genre.category,
    title: `${genre.label} Nasıl Yazılır?`,
    summary: `${genre.label} için adım adım yazarlık ve üretim rehberi.`,
    visuals: {},
  };
}

function safeVisual(value: unknown): EducationVisual | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const url = typeof item.url === "string" ? item.url.trim() : "";
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  return {
    url,
    altText: typeof item.altText === "string" ? item.altText.slice(0, 300) : "",
    filename: typeof item.filename === "string" ? item.filename.slice(0, 180) : undefined,
    mediaId: typeof item.mediaId === "string" ? item.mediaId.slice(0, 80) : undefined,
  };
}

export function parseEducationGuide(valueJson: string, genre: Genre): EducationGuideRecord {
  const fallback = educationGuideDefault(genre);
  try {
    const parsed = JSON.parse(valueJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
    const raw = parsed as Record<string, unknown>;
    const visualsRaw = raw.visuals && typeof raw.visuals === "object" && !Array.isArray(raw.visuals)
      ? raw.visuals as Record<string, unknown>
      : {};
    const visuals: EducationGuideRecord["visuals"] = {};
    for (const slot of EDUCATION_VISUAL_SLOTS) {
      const visual = safeVisual(visualsRaw[slot.key]);
      if (visual) visuals[slot.key] = visual;
    }
    return {
      genreSlug: genre.slug,
      category: genre.category,
      title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim().slice(0, 220) : fallback.title,
      summary: typeof raw.summary === "string" && raw.summary.trim() ? raw.summary.trim().slice(0, 1200) : fallback.summary,
      visuals,
    };
  } catch {
    return fallback;
  }
}

export async function getEducationGuideRecord(genreSlug: string) {
  const genre = getGenreBySlug(genreSlug);
  if (!genre) return null;
  const rows = await prisma.$queryRaw<EducationGuideRow[]>`
    SELECT contentKey, valueJson, updatedAt
    FROM SiteContent
    WHERE namespace = ${EDUCATION_GUIDE_NAMESPACE}
      AND contentKey = ${genre.slug}
      AND status = 'published'
    LIMIT 1
  `;
  return rows[0] ? parseEducationGuide(rows[0].valueJson, genre) : educationGuideDefault(genre);
}

export async function listEducationGuideRecords() {
  const rows = await prisma.$queryRaw<EducationGuideRow[]>`
    SELECT contentKey, valueJson, updatedAt
    FROM SiteContent
    WHERE namespace = ${EDUCATION_GUIDE_NAMESPACE}
      AND status = 'published'
    ORDER BY updatedAt DESC
  `;
  const bySlug = new Map(rows.map((row) => [row.contentKey, row]));
  return GENRES.map((genre) => {
    const row = bySlug.get(genre.slug);
    const guide = row ? parseEducationGuide(row.valueJson, genre) : educationGuideDefault(genre);
    return { genre, guide, updatedAt: row?.updatedAt ?? null };
  });
}

export function isEducationVisualSlotKey(value: string): value is EducationVisualSlotKey {
  return EDUCATION_VISUAL_SLOTS.some((slot) => slot.key === value);
}
