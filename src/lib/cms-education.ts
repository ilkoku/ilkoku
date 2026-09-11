import "server-only";

import { GENRES, getGenreBySlug, type Genre, type GenreCategory } from "@/lib/genres";
import { prisma } from "@/lib/prisma";

export const EDUCATION_GUIDE_NAMESPACE = "education_guide";
export const EDUCATION_GITHUB_MEDIA_ROOT = "public/media/education";

export const EDUCATION_VISUAL_SLOTS = [
  {
    key: "hero",
    number: "01",
    label: "Hero",
    description: "Sayfanın üst ana görseli",
    recommendedWidth: 1600,
    recommendedHeight: 900,
    aspectRatio: "16:9",
    fit: "contain",
    automation: "Oranı korur; crop yapmaz; kaynak çözünürlüğün altına düşürmez ve düşük çözünürlüklü kaynağı kabul etmez.",
  },
  {
    key: "ideaFlow",
    number: "02",
    label: "Fikir Akışı",
    description: "Fikir / süreç / başlangıç anlatımı",
    recommendedWidth: 1440,
    recommendedHeight: 1080,
    aspectRatio: "4:3",
    fit: "contain",
    automation: "Metin ve diyagramı tam gösterir; crop yapmaz; kaynak çözünürlüğü korunur.",
  },
  {
    key: "structure",
    number: "03",
    label: "Yapı Diyagramı",
    description: "Yapı, akış veya olay örgüsü diyagramı",
    recommendedWidth: 1500,
    recommendedHeight: 1000,
    aspectRatio: "3:2",
    fit: "contain",
    automation: "Diyagramın tamamını oranını ve kaynak çözünürlüğünü bozmadan gösterir.",
  },
  {
    key: "anatomy",
    number: "04",
    label: "Eser Anatomisi",
    description: "Bileşenler, karakter veya anatomi panosu",
    recommendedWidth: 1500,
    recommendedHeight: 1000,
    aspectRatio: "3:2",
    fit: "contain",
    automation: "Etiket ve küçük metinleri kesmeden, kaynak kaliteyi değiştirmeden gösterir.",
  },
  {
    key: "pageSetup",
    number: "05",
    label: "Sayfa ve Yazım Ayarı",
    description: "Sayfa, biçim veya yazım ayarı anlatımı",
    recommendedWidth: 1500,
    recommendedHeight: 1000,
    aspectRatio: "3:2",
    fit: "contain",
    automation: "Sayfa örneğini crop yapmadan ve kaynak çözünürlüğü değiştirmeden gösterir.",
  },
  {
    key: "project",
    number: "06",
    label: "Örnek Proje",
    description: "Baştan sona örnek proje / çalışma akışı",
    recommendedWidth: 1500,
    recommendedHeight: 1000,
    aspectRatio: "3:2",
    fit: "contain",
    automation: "Akış panosunu tam gösterir; düşük çözünürlüklü kaynağı büyütmez.",
  },
  {
    key: "finalCta",
    number: "07",
    label: "Final CTA",
    description: "Sayfa sonu çağrı / kapanış görseli",
    recommendedWidth: 1500,
    recommendedHeight: 1000,
    aspectRatio: "3:2",
    fit: "contain",
    automation: "CTA ve arayüz detaylarını kesmeden, kaynak kaliteyi koruyarak gösterir.",
  },
] as const;

export type EducationVisualSlotKey = (typeof EDUCATION_VISUAL_SLOTS)[number]["key"];
export type EducationVisualFit = (typeof EDUCATION_VISUAL_SLOTS)[number]["fit"];

export type EducationVisual = {
  url: string;
  altText: string;
  filename?: string;
  mediaId?: string;
  sourceWidth?: number;
  sourceHeight?: number;
  recommendedWidth: number;
  recommendedHeight: number;
  aspectRatio: string;
  fit: EducationVisualFit;
  folder: string;
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

export function educationMediaFolder(genre: Genre) {
  return `education/${educationCategoryPath(genre.category)}/${genre.slug}`;
}

export function educationGithubMediaFolder(genre: Genre) {
  return `${EDUCATION_GITHUB_MEDIA_ROOT}/${educationCategoryPath(genre.category)}/${genre.slug}`;
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

function safePositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 20000 ? value : undefined;
}

function safeVisual(
  value: unknown,
  slot: (typeof EDUCATION_VISUAL_SLOTS)[number],
  genre: Genre,
): EducationVisual | null {
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
    folder: educationMediaFolder(genre),
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
      const visual = safeVisual(visualsRaw[slot.key], slot, genre);
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
