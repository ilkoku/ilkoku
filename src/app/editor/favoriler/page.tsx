import Link from "next/link";
import type { Metadata } from "next";

import { AdvancedDiscoveryFilterFields } from "@/components/discovery/AdvancedDiscoveryFilterFields";
import {
  DiscoveryPagination,
  DiscoveryResultSummary,
} from "@/components/discovery/DiscoveryListChrome";
import "@/components/discovery/discovery-filter-desk.css";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import {
  getEditorFavoriteCollection,
  type EditorCollectionFilters,
  type EditorCollectionReviewStatus,
  type EditorCollectionWordCount,
} from "@/features/editor-workspace/collection-query";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { EditorWorkCard } from "@/features/editor-workspace/components/EditorWorkCard";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
import { sanitizeDiscoveryAdvancedFilters } from "@/lib/discovery-advanced-filter-management";
import {
  appendDiscoveryAdvancedFilterParams,
  clearDiscoveryAdvancedFilter,
  discoveryAdvancedFilterChips,
  parseDiscoveryAdvancedFilters,
  type DiscoveryAdvancedFilters,
} from "@/lib/discovery-advanced-filters";
import { getDiscoverySurfaceFilterIds } from "@/lib/discovery-filter-config";
import type { DiscoveryFilterId } from "@/lib/discovery-filter-registry";
import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-list-standard";
import { normalizeGenreLabel } from "@/lib/genre-system";
import { GENRE_LABELS } from "@/lib/genres";
import {
  isMemberStoredWorkContentRating,
  workContentRatingDetails,
  type MemberStoredWorkContentRating,
} from "@/lib/work-content-classification";

export const metadata: Metadata = {
  title: "Favorilerim | İlkOku",
};
export const dynamic = "force-dynamic";

const reviewStatuses = [
  "not_requested",
  "requested",
  "in_progress",
  "awaiting_second_editor",
  "second_in_progress",
  "completed",
] as const satisfies readonly EditorCollectionReviewStatus[];
const wordCountStatuses = ["short", "medium", "long"] as const satisfies readonly EditorCollectionWordCount[];

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function includesReviewStatus(value: string): value is EditorCollectionReviewStatus {
  return reviewStatuses.includes(value as EditorCollectionReviewStatus);
}

function includesWordCount(value: string): value is EditorCollectionWordCount {
  return wordCountStatuses.includes(value as EditorCollectionWordCount);
}

function reviewLabel(value: EditorCollectionReviewStatus) {
  if (value === "completed") return "İncelendi";
  if (value === "second_in_progress") return "İkinci editörde";
  if (value === "awaiting_second_editor") return "İkinci editör bekleniyor";
  if (value === "in_progress") return "İlk editörde";
  if (value === "requested") return "İnceleme talep edildi";
  return "Henüz incelenmedi";
}

function wordCountLabel(value: EditorCollectionWordCount) {
  if (value === "short") return "30.000 altı";
  if (value === "medium") return "30.000 – 80.000";
  return "80.000 üzeri";
}

type HrefFilters = Omit<EditorCollectionFilters, "page">;

function pageHref(filters: HrefFilters, page = 1) {
  const params = new URLSearchParams();
  if (filters.search) params.set("arama", filters.search);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.contentRating) params.set("hitap", filters.contentRating);
  if (filters.reviewStatus) params.set("durum", filters.reviewStatus);
  if (filters.language) params.set("dil", filters.language);
  if (filters.wordCount) params.set("kelime", filters.wordCount);
  appendDiscoveryAdvancedFilterParams(params, filters.advanced);
  if (page > 1) params.set("sayfa", String(page));
  const query = params.toString();
  return query ? `/editor/favoriler?${query}` : "/editor/favoriler";
}

export default async function EditorFavoritesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireEditorProfile("/editor/favoriler");
  const enabledFilterIds = new Set<DiscoveryFilterId>(
    await getDiscoverySurfaceFilterIds("editor-favorites"),
  );
  const adultAccess = await getAdultContentAccess(profile.id);
  const visibleRatings = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const params = await searchParams;
  const search = enabledFilterIds.has("search")
    ? firstValue(params.arama).slice(0, 220) || undefined
    : undefined;
  const genre = enabledFilterIds.has("genre")
    ? normalizeGenreLabel(firstValue(params.tur))
    : undefined;
  const ratingValue = firstValue(params.hitap);
  const requestedRating =
    enabledFilterIds.has("contentRating") && isMemberStoredWorkContentRating(ratingValue)
      ? ratingValue
      : undefined;
  const contentRating: MemberStoredWorkContentRating | undefined =
    requestedRating && visibleRatings.includes(requestedRating)
      ? requestedRating
      : undefined;
  const reviewValue = firstValue(params.durum);
  const reviewStatus =
    enabledFilterIds.has("reviewStatus") && includesReviewStatus(reviewValue)
      ? reviewValue
      : undefined;
  const language = enabledFilterIds.has("language")
    ? firstValue(params.dil).slice(0, 10) || undefined
    : undefined;
  const wordValue = firstValue(params.kelime);
  const wordCount =
    enabledFilterIds.has("wordCount") && includesWordCount(wordValue)
      ? wordValue
      : undefined;
  const advanced: DiscoveryAdvancedFilters = sanitizeDiscoveryAdvancedFilters(
    parseDiscoveryAdvancedFilters(params),
    enabledFilterIds,
  );
  const rawPage = Number.parseInt(firstValue(params.sayfa), 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const filters: EditorCollectionFilters = {
    advanced,
    contentRating,
    genre,
    language,
    page: requestedPage,
    reviewStatus,
    search,
    wordCount,
  };
  const hrefFilters: HrefFilters = {
    advanced,
    contentRating,
    genre,
    language,
    reviewStatus,
    search,
    wordCount,
  };
  const data = await getEditorFavoriteCollection(
    profile.id,
    filters,
    adultAccess.canAccessAdultContent,
  );
  const baseActiveFilters = [
    search
      ? {
          href: pageHref({ ...hrefFilters, search: undefined }),
          label: `Arama: ${search}`,
        }
      : null,
    genre
      ? {
          href: pageHref({ ...hrefFilters, genre: undefined }),
          label: `Tür: ${genre}`,
        }
      : null,
    contentRating
      ? {
          href: pageHref({ ...hrefFilters, contentRating: undefined }),
          label: `Yaş: ${workContentRatingDetails[contentRating].shortLabel}`,
        }
      : null,
    reviewStatus
      ? {
          href: pageHref({ ...hrefFilters, reviewStatus: undefined }),
          label: `Editör: ${reviewLabel(reviewStatus)}`,
        }
      : null,
    language
      ? {
          href: pageHref({ ...hrefFilters, language: undefined }),
          label: `Dil: ${language.toLocaleUpperCase("tr-TR")}`,
        }
      : null,
    wordCount
      ? {
          href: pageHref({ ...hrefFilters, wordCount: undefined }),
          label: `Kelime: ${wordCountLabel(wordCount)}`,
        }
      : null,
  ].filter((item): item is { href: string; label: string } => item !== null);
  const advancedActiveFilters = discoveryAdvancedFilterChips(
    advanced,
    enabledFilterIds,
  ).map((item) => ({
    href: pageHref({ ...hrefFilters, advanced: clearDiscoveryAdvancedFilter(advanced, item.id) }),
    label: item.label,
  }));
  const activeFilters = [...baseActiveFilters, ...advancedActiveFilters];
  const hasFilters = activeFilters.length > 0;

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Ortak Eser Havuzu'ndan favoriye aldığınız eserleri aynı çalışma masasında yönetin."
          title="Favorilerim"
        />

        <section aria-label="Editör favori filtre masası" className="role-filter-desk">
          <header className="role-filter-desk__header">
            <div>
              <span>Filtre masası</span>
              <strong>Favori eserlerinizi daraltın</strong>
            </div>
            {hasFilters ? <Link href="/editor/favoriler">Tüm filtreleri temizle</Link> : null}
          </header>

          {enabledFilterIds.size > 0 ? (
            <form className="role-filter-desk__form" method="get">
              {enabledFilterIds.has("search") ? (
                <label className="role-filter-field--search">
                  <span>Arama</span>
                  <input
                    defaultValue={search}
                    name="arama"
                    placeholder="Eser, yazar veya rumuz ara"
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
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {enabledFilterIds.has("contentRating") ? (
                <label>
                  <span>Hitap yaşı</span>
                  <select defaultValue={contentRating ?? ""} name="hitap">
                    <option value="">Tüm yaşlar</option>
                    {visibleRatings.map((rating) => (
                      <option key={rating} value={rating}>
                        {workContentRatingDetails[rating].label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {enabledFilterIds.has("reviewStatus") ? (
                <label>
                  <span>Editör durumu</span>
                  <select defaultValue={reviewStatus ?? ""} name="durum">
                    <option value="">Tümü</option>
                    {reviewStatuses.map((status) => (
                      <option key={status} value={status}>{reviewLabel(status)}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {enabledFilterIds.has("language") ? (
                <label>
                  <span>Dil</span>
                  <input defaultValue={language} name="dil" placeholder="Örn. tr" />
                </label>
              ) : null}

              {enabledFilterIds.has("wordCount") ? (
                <label>
                  <span>Kelime sayısı</span>
                  <select defaultValue={wordCount ?? ""} name="kelime">
                    <option value="">Tümü</option>
                    {wordCountStatuses.map((value) => (
                      <option key={value} value={value}>{wordCountLabel(value)}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              <AdvancedDiscoveryFilterFields
                enabledFilterIds={enabledFilterIds}
                filters={advanced}
              />

              <div className="role-filter-desk__actions">
                <button className="button button--primary" type="submit">
                  Masayı Güncelle
                </button>
                {hasFilters ? (
                  <Link className="button button--ghost" href="/editor/favoriler">
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
              {activeFilters.map((item) => (
                <Link href={item.href} key={`${item.label}-${item.href}`}>
                  {item.label}<b aria-hidden="true">×</b>
                </Link>
              ))}
            </div>
          ) : enabledFilterIds.size > 0 ? (
            <p className="role-filter-desk__hint">
              Filtre seçmeden tüm favori eserlerinizi görüyorsunuz.
            </p>
          ) : null}
        </section>

        <DiscoveryResultSummary
          currentPage={data.currentPage}
          noun="eser"
          pageSize={DISCOVERY_PAGE_SIZE}
          totalCount={data.totalCount}
          visibleCount={data.rows.length}
        />

        {data.rows.length ? (
          <div className="editor-work-grid">
            {data.rows.map((work) => <EditorWorkCard key={work.id} work={work} />)}
          </div>
        ) : (
          <div className="editor-empty">
            <h2>{hasFilters ? "Eşleşen favori eser bulunamadı" : "Henüz favori yok"}</h2>
            <p>
              {hasFilters
                ? "Filtreleri değiştirerek yeniden deneyin."
                : "Keşfettiğiniz eserleri burada biriktirebilirsiniz."}
            </p>
          </div>
        )}

        <DiscoveryPagination
          ariaLabel="Editör favori sayfalama"
          currentPage={data.currentPage}
          hrefForPage={(page) => pageHref(hrefFilters, page)}
          totalPages={data.totalPages}
        />
      </div>
    </AppShell>
  );
}
