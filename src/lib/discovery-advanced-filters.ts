import type { DiscoveryFilterId } from "@/lib/discovery-filter-registry";

export type DiscoveryCompletionStatus = "completed" | "ongoing";
export type DiscoveryBooleanChoice = "no" | "yes";
export type DiscoveryReadingState = "completed" | "in_progress" | "unread";

export type DiscoveryAdvancedFilters = {
  author?: string;
  completionStatus?: DiscoveryCompletionStatus;
  chapterMin?: number;
  chapterMax?: number;
  readerMin?: number;
  readerMax?: number;
  favoriteMin?: number;
  favoriteMax?: number;
  commentMin?: number;
  commentMax?: number;
  hasPassport?: DiscoveryBooleanChoice;
  versionMin?: number;
  versionMax?: number;
  publishedFrom?: string;
  publishedTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  readingProgressMin?: number;
  readingProgressMax?: number;
  readingState?: DiscoveryReadingState;
  lastReadFrom?: string;
  lastReadTo?: string;
  favoriteState?: DiscoveryBooleanChoice;
  country?: string;
  authorPublicWorkMin?: number;
  authorPublicWorkMax?: number;
  authorCompletedWorkMin?: number;
  authorCompletedWorkMax?: number;
  authorReviewedWorkMin?: number;
  authorReviewedWorkMax?: number;
  authorReaderMin?: number;
  authorReaderMax?: number;
  authorFavoriteMin?: number;
  authorFavoriteMax?: number;
  authorCommentMin?: number;
  authorCommentMax?: number;
};

const ADVANCED_PARAM_KEYS = {
  author: ["yazar"],
  completionStatus: ["tamamlanma"],
  chapterCount: ["bolumMin", "bolumMax"],
  readerCount: ["okurMin", "okurMax"],
  favoriteCount: ["favoriMin", "favoriMax"],
  commentCount: ["yorumMin", "yorumMax"],
  hasPassport: ["pasaport"],
  versionCount: ["versiyonMin", "versiyonMax"],
  publishedAt: ["yayinBaslangic", "yayinBitis"],
  updatedAt: ["guncellemeBaslangic", "guncellemeBitis"],
  readingProgress: ["ilerlemeMin", "ilerlemeMax"],
  readingState: ["okumaDurumu"],
  lastReadAt: ["sonOkumaBaslangic", "sonOkumaBitis"],
  favoriteState: ["favoriDurumu"],
  country: ["ulke"],
  authorPublicWorkCount: ["eserMin", "eserMax"],
  authorCompletedWorkCount: ["tamamlananEserMin", "tamamlananEserMax"],
  authorReviewedWorkCount: ["incelenenEserMin", "incelenenEserMax"],
  authorReaderCount: ["yazarOkurMin", "yazarOkurMax"],
  authorFavoriteCount: ["yazarFavoriMin", "yazarFavoriMax"],
  authorCommentCount: ["yazarYorumMin", "yazarYorumMax"],
} as const satisfies Partial<Record<DiscoveryFilterId, readonly string[]>>;

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function parseNumber(value: string, max = 1_000_000_000) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.min(parsed, max);
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : value;
}

function parseBooleanChoice(value: string): DiscoveryBooleanChoice | undefined {
  return value === "yes" || value === "no" ? value : undefined;
}

function parseCompletionStatus(value: string): DiscoveryCompletionStatus | undefined {
  return value === "completed" || value === "ongoing" ? value : undefined;
}

function parseReadingState(value: string): DiscoveryReadingState | undefined {
  return value === "unread" || value === "in_progress" || value === "completed"
    ? value
    : undefined;
}

export function parseDiscoveryAdvancedFilters(
  input: Record<string, string | string[] | undefined>,
): DiscoveryAdvancedFilters {
  return {
    author: firstValue(input.yazar).slice(0, 220) || undefined,
    completionStatus: parseCompletionStatus(firstValue(input.tamamlanma)),
    chapterMin: parseNumber(firstValue(input.bolumMin)),
    chapterMax: parseNumber(firstValue(input.bolumMax)),
    readerMin: parseNumber(firstValue(input.okurMin)),
    readerMax: parseNumber(firstValue(input.okurMax)),
    favoriteMin: parseNumber(firstValue(input.favoriMin)),
    favoriteMax: parseNumber(firstValue(input.favoriMax)),
    commentMin: parseNumber(firstValue(input.yorumMin)),
    commentMax: parseNumber(firstValue(input.yorumMax)),
    hasPassport: parseBooleanChoice(firstValue(input.pasaport)),
    versionMin: parseNumber(firstValue(input.versiyonMin)),
    versionMax: parseNumber(firstValue(input.versiyonMax)),
    publishedFrom: parseDate(firstValue(input.yayinBaslangic)),
    publishedTo: parseDate(firstValue(input.yayinBitis)),
    updatedFrom: parseDate(firstValue(input.guncellemeBaslangic)),
    updatedTo: parseDate(firstValue(input.guncellemeBitis)),
    readingProgressMin: parseNumber(firstValue(input.ilerlemeMin), 100),
    readingProgressMax: parseNumber(firstValue(input.ilerlemeMax), 100),
    readingState: parseReadingState(firstValue(input.okumaDurumu)),
    lastReadFrom: parseDate(firstValue(input.sonOkumaBaslangic)),
    lastReadTo: parseDate(firstValue(input.sonOkumaBitis)),
    favoriteState: parseBooleanChoice(firstValue(input.favoriDurumu)),
    country: firstValue(input.ulke).slice(0, 120) || undefined,
    authorPublicWorkMin: parseNumber(firstValue(input.eserMin)),
    authorPublicWorkMax: parseNumber(firstValue(input.eserMax)),
    authorCompletedWorkMin: parseNumber(firstValue(input.tamamlananEserMin)),
    authorCompletedWorkMax: parseNumber(firstValue(input.tamamlananEserMax)),
    authorReviewedWorkMin: parseNumber(firstValue(input.incelenenEserMin)),
    authorReviewedWorkMax: parseNumber(firstValue(input.incelenenEserMax)),
    authorReaderMin: parseNumber(firstValue(input.yazarOkurMin)),
    authorReaderMax: parseNumber(firstValue(input.yazarOkurMax)),
    authorFavoriteMin: parseNumber(firstValue(input.yazarFavoriMin)),
    authorFavoriteMax: parseNumber(firstValue(input.yazarFavoriMax)),
    authorCommentMin: parseNumber(firstValue(input.yazarYorumMin)),
    authorCommentMax: parseNumber(firstValue(input.yazarYorumMax)),
  };
}

function setNumber(params: URLSearchParams, key: string, value: number | undefined) {
  if (typeof value === "number") params.set(key, String(value));
}

function setString(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value);
}

export function appendDiscoveryAdvancedFilterParams(
  params: URLSearchParams,
  filters: DiscoveryAdvancedFilters,
) {
  setString(params, "yazar", filters.author);
  setString(params, "tamamlanma", filters.completionStatus);
  setNumber(params, "bolumMin", filters.chapterMin);
  setNumber(params, "bolumMax", filters.chapterMax);
  setNumber(params, "okurMin", filters.readerMin);
  setNumber(params, "okurMax", filters.readerMax);
  setNumber(params, "favoriMin", filters.favoriteMin);
  setNumber(params, "favoriMax", filters.favoriteMax);
  setNumber(params, "yorumMin", filters.commentMin);
  setNumber(params, "yorumMax", filters.commentMax);
  setString(params, "pasaport", filters.hasPassport);
  setNumber(params, "versiyonMin", filters.versionMin);
  setNumber(params, "versiyonMax", filters.versionMax);
  setString(params, "yayinBaslangic", filters.publishedFrom);
  setString(params, "yayinBitis", filters.publishedTo);
  setString(params, "guncellemeBaslangic", filters.updatedFrom);
  setString(params, "guncellemeBitis", filters.updatedTo);
  setNumber(params, "ilerlemeMin", filters.readingProgressMin);
  setNumber(params, "ilerlemeMax", filters.readingProgressMax);
  setString(params, "okumaDurumu", filters.readingState);
  setString(params, "sonOkumaBaslangic", filters.lastReadFrom);
  setString(params, "sonOkumaBitis", filters.lastReadTo);
  setString(params, "favoriDurumu", filters.favoriteState);
  setString(params, "ulke", filters.country);
  setNumber(params, "eserMin", filters.authorPublicWorkMin);
  setNumber(params, "eserMax", filters.authorPublicWorkMax);
  setNumber(params, "tamamlananEserMin", filters.authorCompletedWorkMin);
  setNumber(params, "tamamlananEserMax", filters.authorCompletedWorkMax);
  setNumber(params, "incelenenEserMin", filters.authorReviewedWorkMin);
  setNumber(params, "incelenenEserMax", filters.authorReviewedWorkMax);
  setNumber(params, "yazarOkurMin", filters.authorReaderMin);
  setNumber(params, "yazarOkurMax", filters.authorReaderMax);
  setNumber(params, "yazarFavoriMin", filters.authorFavoriteMin);
  setNumber(params, "yazarFavoriMax", filters.authorFavoriteMax);
  setNumber(params, "yazarYorumMin", filters.authorCommentMin);
  setNumber(params, "yazarYorumMax", filters.authorCommentMax);
  return params;
}

function hasRange(min: number | undefined, max: number | undefined) {
  return typeof min === "number" || typeof max === "number";
}

export function hasDiscoveryAdvancedFilters(filters: DiscoveryAdvancedFilters) {
  return Boolean(
    filters.author ||
      filters.completionStatus ||
      hasRange(filters.chapterMin, filters.chapterMax) ||
      hasRange(filters.readerMin, filters.readerMax) ||
      hasRange(filters.favoriteMin, filters.favoriteMax) ||
      hasRange(filters.commentMin, filters.commentMax) ||
      filters.hasPassport ||
      hasRange(filters.versionMin, filters.versionMax) ||
      filters.publishedFrom ||
      filters.publishedTo ||
      filters.updatedFrom ||
      filters.updatedTo ||
      hasRange(filters.readingProgressMin, filters.readingProgressMax) ||
      filters.readingState ||
      filters.lastReadFrom ||
      filters.lastReadTo ||
      filters.favoriteState ||
      filters.country ||
      hasRange(filters.authorPublicWorkMin, filters.authorPublicWorkMax) ||
      hasRange(filters.authorCompletedWorkMin, filters.authorCompletedWorkMax) ||
      hasRange(filters.authorReviewedWorkMin, filters.authorReviewedWorkMax) ||
      hasRange(filters.authorReaderMin, filters.authorReaderMax) ||
      hasRange(filters.authorFavoriteMin, filters.authorFavoriteMax) ||
      hasRange(filters.authorCommentMin, filters.authorCommentMax)
  );
}

function matchesRange(value: number | undefined, min?: number, max?: number) {
  if (typeof min !== "number" && typeof max !== "number") return true;
  if (typeof value !== "number") return false;
  if (typeof min === "number" && value < min) return false;
  if (typeof max === "number" && value > max) return false;
  return true;
}

function dateValue(value: Date | string | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function matchesDateRange(
  value: Date | string | null | undefined,
  from?: string,
  to?: string,
) {
  if (!from && !to) return true;
  const parsed = dateValue(value);
  if (!parsed) return false;
  if (from && parsed.getTime() < new Date(`${from}T00:00:00.000Z`).getTime()) return false;
  if (to && parsed.getTime() > new Date(`${to}T23:59:59.999Z`).getTime()) return false;
  return true;
}

export type DiscoveryWorkFilterMetrics = {
  authorName?: string | null;
  authorUsername?: string | null;
  chapterCount?: number;
  commentCount?: number;
  completionStatus?: DiscoveryCompletionStatus;
  favoriteCount?: number;
  hasPassport?: boolean;
  isFavorite?: boolean;
  lastReadAt?: Date | string | null;
  progressPercent?: number | null;
  publishedAt?: Date | string | null;
  readerCount?: number;
  readingState?: DiscoveryReadingState;
  updatedAt?: Date | string | null;
  versionCount?: number;
};

export function matchesDiscoveryAdvancedWorkFilters(
  work: DiscoveryWorkFilterMetrics,
  filters: DiscoveryAdvancedFilters,
) {
  if (filters.author) {
    const needle = filters.author.toLocaleLowerCase("tr-TR");
    const haystack = [work.authorName, work.authorUsername]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("tr-TR");
    if (!haystack.includes(needle)) return false;
  }
  if (filters.completionStatus && work.completionStatus !== filters.completionStatus) return false;
  if (!matchesRange(work.chapterCount, filters.chapterMin, filters.chapterMax)) return false;
  if (!matchesRange(work.readerCount, filters.readerMin, filters.readerMax)) return false;
  if (!matchesRange(work.favoriteCount, filters.favoriteMin, filters.favoriteMax)) return false;
  if (!matchesRange(work.commentCount, filters.commentMin, filters.commentMax)) return false;
  if (filters.hasPassport && work.hasPassport !== (filters.hasPassport === "yes")) return false;
  if (!matchesRange(work.versionCount, filters.versionMin, filters.versionMax)) return false;
  if (!matchesDateRange(work.publishedAt, filters.publishedFrom, filters.publishedTo)) return false;
  if (!matchesDateRange(work.updatedAt, filters.updatedFrom, filters.updatedTo)) return false;
  if (!matchesRange(
    typeof work.progressPercent === "number" ? work.progressPercent : undefined,
    filters.readingProgressMin,
    filters.readingProgressMax,
  )) return false;
  if (filters.readingState && work.readingState !== filters.readingState) return false;
  if (!matchesDateRange(work.lastReadAt, filters.lastReadFrom, filters.lastReadTo)) return false;
  if (filters.favoriteState && work.isFavorite !== (filters.favoriteState === "yes")) return false;
  return true;
}

export type DiscoveryAuthorFilterMetrics = {
  commentCount?: number;
  completedWorkCount?: number;
  country?: string | null;
  favoriteCount?: number;
  publicWorkCount?: number;
  readerCount?: number;
  reviewedWorkCount?: number;
};

export function matchesDiscoveryAdvancedAuthorFilters(
  author: DiscoveryAuthorFilterMetrics,
  filters: DiscoveryAdvancedFilters,
) {
  if (filters.country) {
    const country = author.country?.toLocaleLowerCase("tr-TR") ?? "";
    if (!country.includes(filters.country.toLocaleLowerCase("tr-TR"))) return false;
  }
  if (!matchesRange(author.publicWorkCount, filters.authorPublicWorkMin, filters.authorPublicWorkMax)) return false;
  if (!matchesRange(author.completedWorkCount, filters.authorCompletedWorkMin, filters.authorCompletedWorkMax)) return false;
  if (!matchesRange(author.reviewedWorkCount, filters.authorReviewedWorkMin, filters.authorReviewedWorkMax)) return false;
  if (!matchesRange(author.readerCount, filters.authorReaderMin, filters.authorReaderMax)) return false;
  if (!matchesRange(author.favoriteCount, filters.authorFavoriteMin, filters.authorFavoriteMax)) return false;
  if (!matchesRange(author.commentCount, filters.authorCommentMin, filters.authorCommentMax)) return false;
  return true;
}

function rangeLabel(label: string, min?: number, max?: number) {
  if (typeof min === "number" && typeof max === "number") return `${label}: ${min}–${max}`;
  if (typeof min === "number") return `${label}: en az ${min}`;
  if (typeof max === "number") return `${label}: en çok ${max}`;
  return null;
}

function dateRangeLabel(label: string, from?: string, to?: string) {
  if (from && to) return `${label}: ${from}–${to}`;
  if (from) return `${label}: ${from} sonrası`;
  if (to) return `${label}: ${to} öncesi`;
  return null;
}

export function discoveryAdvancedFilterChips(
  filters: DiscoveryAdvancedFilters,
  enabledFilterIds: ReadonlySet<DiscoveryFilterId>,
) {
  const chips: Array<{ id: DiscoveryFilterId; label: string }> = [];
  const push = (id: DiscoveryFilterId, label: string | null) => {
    if (enabledFilterIds.has(id) && label) chips.push({ id, label });
  };

  push("author", filters.author ? `Yazar: ${filters.author}` : null);
  push(
    "completionStatus",
    filters.completionStatus
      ? `Eser: ${filters.completionStatus === "completed" ? "tamamlandı" : "devam ediyor"}`
      : null,
  );
  push("chapterCount", rangeLabel("Bölüm", filters.chapterMin, filters.chapterMax));
  push("readerCount", rangeLabel("Okur", filters.readerMin, filters.readerMax));
  push("favoriteCount", rangeLabel("Favori", filters.favoriteMin, filters.favoriteMax));
  push("commentCount", rangeLabel("Yorum", filters.commentMin, filters.commentMax));
  push(
    "hasPassport",
    filters.hasPassport ? `Pasaport: ${filters.hasPassport === "yes" ? "var" : "yok"}` : null,
  );
  push("versionCount", rangeLabel("Versiyon", filters.versionMin, filters.versionMax));
  push("publishedAt", dateRangeLabel("Yayın", filters.publishedFrom, filters.publishedTo));
  push("updatedAt", dateRangeLabel("Güncelleme", filters.updatedFrom, filters.updatedTo));
  push(
    "readingProgress",
    rangeLabel("İlerleme %", filters.readingProgressMin, filters.readingProgressMax),
  );
  push(
    "readingState",
    filters.readingState
      ? `Okuma: ${filters.readingState === "completed" ? "tamamlandı" : filters.readingState === "in_progress" ? "devam ediyor" : "okunmadı"}`
      : null,
  );
  push("lastReadAt", dateRangeLabel("Son okuma", filters.lastReadFrom, filters.lastReadTo));
  push(
    "favoriteState",
    filters.favoriteState ? `Favori: ${filters.favoriteState === "yes" ? "evet" : "hayır"}` : null,
  );
  push("country", filters.country ? `Ülke: ${filters.country}` : null);
  push(
    "authorPublicWorkCount",
    rangeLabel("Public eser", filters.authorPublicWorkMin, filters.authorPublicWorkMax),
  );
  push(
    "authorCompletedWorkCount",
    rangeLabel("Tamamlanan eser", filters.authorCompletedWorkMin, filters.authorCompletedWorkMax),
  );
  push(
    "authorReviewedWorkCount",
    rangeLabel("İncelenen eser", filters.authorReviewedWorkMin, filters.authorReviewedWorkMax),
  );
  push(
    "authorReaderCount",
    rangeLabel("Yazar okuru", filters.authorReaderMin, filters.authorReaderMax),
  );
  push(
    "authorFavoriteCount",
    rangeLabel("Yazar favorisi", filters.authorFavoriteMin, filters.authorFavoriteMax),
  );
  push(
    "authorCommentCount",
    rangeLabel("Yazar yorumu", filters.authorCommentMin, filters.authorCommentMax),
  );

  return chips;
}

export function clearDiscoveryAdvancedFilter(
  filters: DiscoveryAdvancedFilters,
  id: DiscoveryFilterId,
): DiscoveryAdvancedFilters {
  const next = { ...filters };
  const keys = ADVANCED_PARAM_KEYS[id];
  if (!keys) return next;

  switch (id) {
    case "author": next.author = undefined; break;
    case "completionStatus": next.completionStatus = undefined; break;
    case "chapterCount": next.chapterMin = next.chapterMax = undefined; break;
    case "readerCount": next.readerMin = next.readerMax = undefined; break;
    case "favoriteCount": next.favoriteMin = next.favoriteMax = undefined; break;
    case "commentCount": next.commentMin = next.commentMax = undefined; break;
    case "hasPassport": next.hasPassport = undefined; break;
    case "versionCount": next.versionMin = next.versionMax = undefined; break;
    case "publishedAt": next.publishedFrom = next.publishedTo = undefined; break;
    case "updatedAt": next.updatedFrom = next.updatedTo = undefined; break;
    case "readingProgress": next.readingProgressMin = next.readingProgressMax = undefined; break;
    case "readingState": next.readingState = undefined; break;
    case "lastReadAt": next.lastReadFrom = next.lastReadTo = undefined; break;
    case "favoriteState": next.favoriteState = undefined; break;
    case "country": next.country = undefined; break;
    case "authorPublicWorkCount": next.authorPublicWorkMin = next.authorPublicWorkMax = undefined; break;
    case "authorCompletedWorkCount": next.authorCompletedWorkMin = next.authorCompletedWorkMax = undefined; break;
    case "authorReviewedWorkCount": next.authorReviewedWorkMin = next.authorReviewedWorkMax = undefined; break;
    case "authorReaderCount": next.authorReaderMin = next.authorReaderMax = undefined; break;
    case "authorFavoriteCount": next.authorFavoriteMin = next.authorFavoriteMax = undefined; break;
    case "authorCommentCount": next.authorCommentMin = next.authorCommentMax = undefined; break;
    default: break;
  }

  return next;
}
