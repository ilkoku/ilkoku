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

export type ReaderReviewFilter = (typeof readerReviewFilters)[number];

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
  contentRating?: StoredWorkContentRating;
  genre?: string;
  page: number;
  reviewStatus?: ReaderReviewFilter;
  search?: string;
  sort: string;
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

export function parseReaderStandardFilters(
  params: Record<string, string | string[] | undefined>,
  ratingOptions: readonly StoredWorkContentRating[],
  sortOptions: readonly ReaderSortOption[],
  defaultSort: string,
): ReaderStandardFilters {
  const searchValue = Array.isArray(params.arama) ? params.arama[0] : params.arama;
  const editorValue = Array.isArray(params.editor) ? params.editor[0] : params.editor;
  const ratingValue = Array.isArray(params.hitapYasi) ? params.hitapYasi[0] : params.hitapYasi;
  const sortValue = Array.isArray(params.siralama) ? params.siralama[0] : params.siralama;
  const genreValue = Array.isArray(params.tur) ? params.tur[0] : params.tur;
  const pageValue = Array.isArray(params.sayfa) ? params.sayfa[0] : params.sayfa;
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
  const rawPage = Number.parseInt(pageValue ?? "", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  return {
    advanced: parseDiscoveryAdvancedFilters(params),
    contentRating,
    genre,
    page,
    reviewStatus,
    search,
    sort,
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
  appendDiscoveryAdvancedFilterParams(params, filters.advanced);
  if (page > 1) params.set("sayfa", String(page));

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function readerWorkMatches(
  work: ReaderWorkRow,
  filters: Pick<
    ReaderStandardFilters,
    "advanced" | "contentRating" | "genre" | "reviewStatus" | "search"
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

  return matchesDiscoveryAdvancedWorkFilters(
    {
      authorName: work.authorName,
      authorUsername: work.authorUsername,
      chapterCount: work.chapterCount,
      commentCount: work.commentCount,
      favoriteCount: work.favoriteCount,
      isFavorite: work.isFavorite,
      progressPercent: work.progressPercent,
      publishedAt: work.publishedAt,
      readerCount: work.readerCount,
      readingState: work.readingState,
      updatedAt: work.updatedAt,
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
  const visibleActiveFilters = [...activeFilters, ...advancedActiveFilters];
  const hasFilters = visibleActiveFilters.length > 0;
  const hasManagedFields = enabledFilterIds.size > 0;

  return (
    <section aria-label="Filtre masası" className="role-filter-desk">
      <header className="role-filter-desk__header">
        <div>
          <span>Filtre masası</span>
          <strong>{heading}</strong>
        </div>
        {hasFilters ? <Link href={clearHref}>Tüm filtreleri temizle</Link> : null}
      </header>

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
    </section>
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
