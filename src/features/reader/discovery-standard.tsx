import Link from "next/link";

import { AdvancedDiscoveryFilterFields } from "@/components/discovery/AdvancedDiscoveryFilterFields";
import {
  DiscoveryResultSummary,
} from "@/components/discovery/DiscoveryListChrome";
import "@/components/discovery/discovery-filter-desk.css";
import type { ReaderWorkRow } from "@/features/reader/components/ReaderWorksTable";
import { sanitizeDiscoveryAdvancedFilters } from "@/lib/discovery-advanced-filter-management";
import {
  appendDiscoveryAdvancedFilterParams,
  clearDiscoveryAdvancedFilter,
  discoveryAdvancedFilterChips,
  matchesDiscoveryAdvancedWorkFilters,
  parseDiscoveryAdvancedFilters,
  type DiscoveryAdvancedFilters,
} from "@/lib/discovery-advanced-filters";
import { getDiscoverySurfaceFilterIds } from "@/lib/discovery-filter-config";
import type { DiscoveryFilterId } from "@/lib/discovery-filter-registry";
import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-list-standard";
import { normalizeGenreLabel } from "@/lib/genre-system";
import { GENRE_LABELS } from "@/lib/genres";
import {
  workContentRatingDetails,
  type StoredWorkContentRating,
} from "@/lib/work-content-classification";

export { DiscoveryPagination as ReaderPagination } from "@/components/discovery/DiscoveryListChrome";

export const READER_LIST_PAGE_SIZE = DISCOVERY_PAGE_SIZE;

export const readerReviewFilters = [
  "not_requested",
  "requested",
  "in_progress",
  "awaiting_second_editor",
  "second_in_progress",
  "completed",
] as const;
export const readerWordCountFilters = ["short", "medium", "long"] as const;

export type ReaderReviewFilter = (typeof readerReviewFilters)[number];
export type ReaderWordCountFilter = (typeof readerWordCountFilters)[number];

export type ReaderActiveFilter = {
  href: string;
  label: string;
};

export type ReaderSortOption = {
  label: string;
  value: string;
};

export type ReaderStandardFilters = {
  advanced: DiscoveryAdvancedFilters;
  city?: string;
  contentRating?: StoredWorkContentRating;
  genre?: string;
  language?: string;
  page: number;
  reviewStatus?: ReaderReviewFilter;
  search?: string;
  sort: string;
  wordCount?: ReaderWordCountFilter;
};

export function includesReaderFilter<T extends string>(
  values: readonly T[],
  value: string | undefined,
): value is T {
  return Boolean(value && values.includes(value as T));
}

export function readerReviewLabel(status: ReaderReviewFilter) {
  switch (status) {
    case "not_requested":
      return "Henüz incelenmedi";
    case "requested":
      return "İnceleme talep edildi";
    case "in_progress":
      return "İlk editörde";
    case "awaiting_second_editor":
      return "İkinci editör bekleniyor";
    case "second_in_progress":
      return "İkinci editörde";
    case "completed":
      return "İncelendi";
  }
}

export function readerWordCountLabel(value: ReaderWordCountFilter) {
  if (value === "short") return "30.000 altı";
  if (value === "medium") return "30.000 – 80.000";
  return "80.000 üzeri";
}

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function parseReaderStandardFilters(
  params: Record<string, string | string[] | undefined>,
  ratingOptions: readonly StoredWorkContentRating[],
  sortOptions: readonly ReaderSortOption[],
  defaultSort: string,
): ReaderStandardFilters {
  const searchValue = firstParam(params, "arama");
  const editorValue = firstParam(params, "editor");
  const ratingValue = firstParam(params, "hitapYasi");
  const sortValue = firstParam(params, "siralama");
  const genreValue = firstParam(params, "tur");
  const pageValue = firstParam(params, "sayfa");
  const cityValue = firstParam(params, "sehir")?.trim().slice(0, 120);
  const languageValue = firstParam(params, "dil")?.trim().slice(0, 10);
  const wordCountValue = firstParam(params, "kelime");
  const search = searchValue?.trim().slice(0, 220) || undefined;
  const genre = normalizeGenreLabel(genreValue);
  const contentRating =
    ratingValue &&
    ratingOptions.includes(ratingValue as StoredWorkContentRating)
      ? (ratingValue as StoredWorkContentRating)
      : undefined;
  const reviewStatus = includesReaderFilter(readerReviewFilters, editorValue)
    ? editorValue
    : undefined;
  const sort = sortOptions.some((option) => option.value === sortValue)
    ? (sortValue as string)
    : defaultSort;
  const wordCount = includesReaderFilter(readerWordCountFilters, wordCountValue)
    ? wordCountValue
    : undefined;
  const rawPage = Number.parseInt(pageValue ?? "", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  return {
    advanced: parseDiscoveryAdvancedFilters(params),
    city: cityValue || undefined,
    contentRating,
    genre,
    language: languageValue || undefined,
    page,
    reviewStatus,
    search,
    sort,
    wordCount,
  };
}

export async function parseManagedReaderStandardFilters(
  surfaceId: string,
  params: Record<string, string | string[] | undefined>,
  ratingOptions: readonly StoredWorkContentRating[],
  sortOptions: readonly ReaderSortOption[],
  defaultSort: string,
) {
  const enabledFilterIds = new Set<DiscoveryFilterId>(
    await getDiscoverySurfaceFilterIds(surfaceId),
  );
  const filters = parseReaderStandardFilters(
    params,
    ratingOptions,
    sortOptions,
    defaultSort,
  );

  if (!enabledFilterIds.has("search")) filters.search = undefined;
  if (!enabledFilterIds.has("genre")) filters.genre = undefined;
  if (!enabledFilterIds.has("contentRating")) filters.contentRating = undefined;
  if (!enabledFilterIds.has("reviewStatus")) filters.reviewStatus = undefined;
  if (!enabledFilterIds.has("sort")) filters.sort = defaultSort;
  if (!enabledFilterIds.has("city")) filters.city = undefined;
  if (!enabledFilterIds.has("language")) filters.language = undefined;
  if (!enabledFilterIds.has("wordCount")) filters.wordCount = undefined;
  filters.advanced = sanitizeDiscoveryAdvancedFilters(
    filters.advanced,
    enabledFilterIds,
  );

  return { enabledFilterIds, filters };
}

export function readerListHref(
  basePath: string,
  filters: ReaderStandardFilters,
  page: number,
  fixedParams: Record<string, string> = {},
) {
  const params = new URLSearchParams(fixedParams);

  if (filters.search) params.set("arama", filters.search);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.contentRating) params.set("hitapYasi", filters.contentRating);
  if (filters.reviewStatus) params.set("editor", filters.reviewStatus);
  if (filters.sort) params.set("siralama", filters.sort);
  if (filters.city) params.set("sehir", filters.city);
  if (filters.language) params.set("dil", filters.language);
  if (filters.wordCount) params.set("kelime", filters.wordCount);
  appendDiscoveryAdvancedFilterParams(params, filters.advanced);
  if (page > 1) params.set("sayfa", String(page));

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function readerWorkMatches(
  work: ReaderWorkRow,
  filters: Pick<
    ReaderStandardFilters,
    | "advanced"
    | "contentRating"
    | "genre"
    | "language"
    | "reviewStatus"
    | "search"
    | "wordCount"
  >,
) {
  if (filters.search) {
    const needle = filters.search.toLocaleLowerCase("tr-TR");
    const values = [work.title, work.authorName, work.authorUsername];
    if (
      !values.some((value) =>
        value?.toLocaleLowerCase("tr-TR").includes(needle),
      )
    ) {
      return false;
    }
  }

  if (filters.genre && work.genre !== filters.genre) return false;
  if (filters.contentRating && work.contentRating !== filters.contentRating) {
    return false;
  }
  if (filters.reviewStatus && work.editorReviewStatus !== filters.reviewStatus) {
    return false;
  }
  if (filters.language && work.language !== filters.language) return false;
  if (filters.wordCount) {
    const words = work.totalWords ?? 0;
    if (filters.wordCount === "short" && words >= 30_000) return false;
    if (
      filters.wordCount === "medium" &&
      (words < 30_000 || words > 80_000)
    ) {
      return false;
    }
    if (filters.wordCount === "long" && words <= 80_000) return false;
  }

  return matchesDiscoveryAdvancedWorkFilters(
    {
      authorName: work.authorName,
      authorUsername: work.authorUsername,
      chapterCount: work.chapterCount,
      commentCount: work.commentCount,
      completionStatus: work.completionStatus,
      favoriteCount: work.favoriteCount,
      hasPassport: work.hasPassport,
      isFavorite: work.isFavorite,
      lastReadAt: work.lastReadAt,
      progressPercent: work.progressPercent,
      publishedAt: work.publishedAt,
      readerCount: work.readerCount,
      readingState: work.readingState,
      updatedAt: work.updatedAt,
      versionCount: work.versionCount,
    },
    filters.advanced,
  );
}

function inferReaderSurfaceId(
  clearHref: string,
  hiddenFields: Array<{ name: string; value: string }>,
) {
  if (clearHref.startsWith("/yazar-kesfet")) return "reader-author-discovery";
  if (clearHref.startsWith("/okumaya-devam")) return "reader-continue-reading";
  if (clearHref.startsWith("/tamamlanan-eserler")) return "reader-completed-works";
  if (clearHref.startsWith("/favorilerim")) {
    return hiddenFields.some((field) => field.name === "tip" && field.value === "yazar")
      ? "reader-favorite-authors"
      : "reader-favorite-works";
  }
  return "reader-work-discovery";
}

export async function ReaderFilterDesk({
  activeFilters,
  advancedFilters,
  clearHref,
  contentRating,
  genre,
  heading,
  hiddenFields = [],
  hint,
  ratingOptions,
  reviewStatus,
  search,
  searchPlaceholder,
  sort,
  sortOptions,
  standardFilters,
  surfaceId,
}: {
  activeFilters: ReaderActiveFilter[];
  advancedFilters: DiscoveryAdvancedFilters;
  clearHref: string;
  contentRating?: string;
  genre?: string;
  heading: string;
  hiddenFields?: Array<{ name: string; value: string }>;
  hint: string;
  ratingOptions: readonly StoredWorkContentRating[];
  reviewStatus?: ReaderReviewFilter;
  search?: string;
  searchPlaceholder: string;
  sort: string;
  sortOptions: readonly ReaderSortOption[];
  standardFilters: ReaderStandardFilters;
  surfaceId?: string;
}) {
  const resolvedSurfaceId = surfaceId ?? inferReaderSurfaceId(clearHref, hiddenFields);
  const enabledFilterIds = new Set<DiscoveryFilterId>(
    await getDiscoverySurfaceFilterIds(resolvedSurfaceId),
  );
  const basePath = clearHref.split("?")[0] ?? clearHref;
  const fixedParams = Object.fromEntries(
    hiddenFields.map((field) => [field.name, field.value]),
  );
  const advancedActiveFilters = discoveryAdvancedFilterChips(
    advancedFilters,
    enabledFilterIds,
  ).map((item) => ({
    href: readerListHref(
      basePath,
      {
        ...standardFilters,
        advanced: clearDiscoveryAdvancedFilter(advancedFilters, item.id),
      },
      1,
      fixedParams,
    ),
    label: item.label,
  }));
  const managedExtraActiveFilters: ReaderActiveFilter[] = [
    standardFilters.city && enabledFilterIds.has("city")
      ? {
          href: readerListHref(
            basePath,
            { ...standardFilters, city: undefined },
            1,
            fixedParams,
          ),
          label: `Şehir: ${standardFilters.city}`,
        }
      : null,
    standardFilters.language && enabledFilterIds.has("language")
      ? {
          href: readerListHref(
            basePath,
            { ...standardFilters, language: undefined },
            1,
            fixedParams,
          ),
          label: `Dil: ${standardFilters.language === "tr" ? "Türkçe" : standardFilters.language === "en" ? "İngilizce" : standardFilters.language.toLocaleUpperCase("tr-TR")}`,
        }
      : null,
    standardFilters.wordCount && enabledFilterIds.has("wordCount")
      ? {
          href: readerListHref(
            basePath,
            { ...standardFilters, wordCount: undefined },
            1,
            fixedParams,
          ),
          label: `Kelime: ${readerWordCountLabel(standardFilters.wordCount)}`,
        }
      : null,
  ].filter((item): item is ReaderActiveFilter => item !== null);
  const visibleActiveFilters = [
    ...activeFilters,
    ...managedExtraActiveFilters,
    ...advancedActiveFilters,
  ];
  const hasFilters = visibleActiveFilters.length > 0;
  const hasManagedFields = enabledFilterIds.size > 0;

  return (
    <details
      aria-label="Filtre masası"
      className="role-filter-desk role-filter-desk--collapsible"
      open={hasFilters}
    >
      <summary className="role-filter-desk__header role-filter-desk__summary">
        <div>
          <span>Filtre masası</span>
          <strong>{heading}</strong>
          {hasFilters ? (
            <small>{visibleActiveFilters.length} aktif filtre</small>
          ) : null}
        </div>
        <span className="role-filter-desk__toggle">
          <span>Aç / kapat</span>
          <b aria-hidden="true">⌄</b>
        </span>
      </summary>

      {hasFilters ? (
        <div className="role-filter-desk__clear-row">
          <Link href={clearHref}>Tüm filtreleri temizle</Link>
        </div>
      ) : null}

      {hasManagedFields ? (
        <form className="role-filter-desk__form" method="get">
          {hiddenFields.map((field) => (
            <input key={field.name} name={field.name} type="hidden" value={field.value} />
          ))}

          {enabledFilterIds.has("search") ? (
            <label className="role-filter-field--search">
              <span>Arama</span>
              <input
                defaultValue={search}
                name="arama"
                placeholder={searchPlaceholder}
                type="search"
              />
            </label>
          ) : null}

          {enabledFilterIds.has("genre") ? (
            <label>
              <span>Tür</span>
              <select defaultValue={genre ?? ""} name="tur">
                <option value="">Tüm türler</option>
                {GENRE_LABELS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {enabledFilterIds.has("contentRating") ? (
            <label>
              <span>Hitap yaşı</span>
              <select defaultValue={contentRating ?? ""} name="hitapYasi">
                <option value="">Tümü</option>
                {ratingOptions.map((rating) => (
                  <option key={rating} value={rating}>
                    {workContentRatingDetails[rating].shortLabel}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {enabledFilterIds.has("reviewStatus") ? (
            <label>
              <span>Editör durumu</span>
              <select defaultValue={reviewStatus ?? ""} name="editor">
                <option value="">Tümü</option>
                <option value="not_requested">Henüz incelenmedi</option>
                <option value="requested">İnceleme talep edildi</option>
                <option value="in_progress">İlk editörde</option>
                <option value="awaiting_second_editor">İkinci editör bekleniyor</option>
                <option value="second_in_progress">İkinci editörde</option>
                <option value="completed">İncelendi</option>
              </select>
            </label>
          ) : null}

          {enabledFilterIds.has("sort") ? (
            <label>
              <span>Sıralama</span>
              <select defaultValue={sort} name="siralama">
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {enabledFilterIds.has("city") ? (
            <label>
              <span>Şehir</span>
              <input
                defaultValue={standardFilters.city}
                name="sehir"
                placeholder="Örn. İstanbul"
              />
            </label>
          ) : null}

          {enabledFilterIds.has("language") ? (
            <label>
              <span>Dil</span>
              <select defaultValue={standardFilters.language ?? ""} name="dil">
                <option value="">Tüm diller</option>
                <option value="tr">Türkçe</option>
                <option value="en">İngilizce</option>
                <option value="de">Almanca</option>
                <option value="fr">Fransızca</option>
              </select>
            </label>
          ) : null}

          {enabledFilterIds.has("wordCount") ? (
            <label>
              <span>Kelime sayısı</span>
              <select defaultValue={standardFilters.wordCount ?? ""} name="kelime">
                <option value="">Tümü</option>
                {readerWordCountFilters.map((value) => (
                  <option key={value} value={value}>
                    {readerWordCountLabel(value)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <AdvancedDiscoveryFilterFields
            enabledFilterIds={enabledFilterIds}
            filters={advancedFilters}
          />

          <div className="role-filter-desk__actions">
            <button className="button button--primary" type="submit">
              Masayı Güncelle
            </button>
            {hasFilters ? (
              <Link className="button button--ghost" href={clearHref}>
                Temizle
              </Link>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="role-filter-desk__hint">
          Bu yüzeyde Filtre Masası alanları İçerik Yönetimi&apos;nden kapatıldı.
        </p>
      )}

      {hasFilters ? (
        <div aria-label="Aktif filtreler" className="role-filter-desk__active">
          <span>Aktif</span>
          {visibleActiveFilters.map((item) => (
            <Link href={item.href} key={`${item.label}-${item.href}`}>
              {item.label}
              <b aria-hidden="true">×</b>
            </Link>
          ))}
        </div>
      ) : hasManagedFields ? (
        <p className="role-filter-desk__hint">{hint}</p>
      ) : null}
    </details>
  );
}

export function ReaderResultSummary({
  currentPage,
  pageSize = READER_LIST_PAGE_SIZE,
  totalCount,
  visibleCount,
  noun,
}: {
  currentPage: number;
  pageSize?: number;
  totalCount: number;
  visibleCount: number;
  noun: string;
}) {
  return (
    <DiscoveryResultSummary
      currentPage={currentPage}
      noun={noun}
      pageSize={pageSize}
      totalCount={totalCount}
      visibleCount={visibleCount}
    />
  );
}
