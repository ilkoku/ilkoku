import Link from "next/link";
import type { Metadata } from "next";

import { AdvancedDiscoveryFilterFields } from "@/components/discovery/AdvancedDiscoveryFilterFields";
import {
  DiscoveryPagination,
  DiscoveryResultSummary,
} from "@/components/discovery/DiscoveryListChrome";
import { DiscoveryWorkspaceHero } from "@/components/discovery/DiscoveryWorkspaceHero";
import "@/components/discovery/discovery-filter-desk.css";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { getCommonEditorDiscovery } from "@/features/editor-workspace/common-discovery-query";
import { EditorWorksTable } from "@/features/editor-workspace/components/EditorWorksTable";
import { getAdultContentAccess, visibleMemberContentRatings } from "@/lib/adult-content-access";
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
import { normalizeGenreLabel } from "@/lib/genre-system";
import { GENRE_LABELS } from "@/lib/genres";
import {
  isMemberStoredWorkContentRating,
  workContentRatingDetails,
  type MemberStoredWorkContentRating,
} from "@/lib/work-content-classification";

export const metadata: Metadata = {
  title: "Editör Keşfet | İlkOku",
  description: "İlkOku ortak havuzundaki yayımlanmış eserleri keşfedin.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
const languageFilters = ["tr", "en", "de", "fr"] as const;
const reviewFilters = [
  "not_requested",
  "requested",
  "in_progress",
  "awaiting_second_editor",
  "second_in_progress",
  "completed",
] as const;
const wordCountFilters = ["short", "medium", "long"] as const;

type LanguageFilter = (typeof languageFilters)[number];
type ReviewFilter = (typeof reviewFilters)[number];
type WordCountFilter = (typeof wordCountFilters)[number];

type EditorExploreFilters = {
  advanced: DiscoveryAdvancedFilters;
  contentRating?: MemberStoredWorkContentRating;
  genre?: string;
  language?: LanguageFilter;
  reviewStatus?: ReviewFilter;
  search?: string;
  wordCount?: WordCountFilter;
};

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function includesValue<T extends string>(
  values: readonly T[],
  value: string | undefined,
): value is T {
  return Boolean(value && values.includes(value as T));
}

function reviewLabel(value: ReviewFilter) {
  switch (value) {
    case "not_requested":
      return "Henüz incelenmedi";
    case "requested":
      return "Yazar görüşe açık";
    case "in_progress":
      return "İlk editörde";
    case "awaiting_second_editor":
      return "İkinci editör bekliyor";
    case "second_in_progress":
      return "İkinci editörde";
    case "completed":
      return "Tamamlandı";
  }
}

function wordCountLabel(value: WordCountFilter) {
  if (value === "short") return "30.000 altı";
  if (value === "medium") return "30.000 – 80.000";
  return "80.000 üzeri";
}

function filterHref(filters: EditorExploreFilters, page = 1) {
  const params = new URLSearchParams();

  if (filters.search) params.set("arama", filters.search);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.language) params.set("dil", filters.language);
  if (filters.contentRating) params.set("hitap", filters.contentRating);
  if (filters.wordCount) params.set("kelime", filters.wordCount);
  if (filters.reviewStatus) params.set("durum", filters.reviewStatus);
  appendDiscoveryAdvancedFilterParams(params, filters.advanced);
  if (page > 1) params.set("sayfa", String(page));

  const query = params.toString();
  return query ? `/editor/kesfet?${query}` : "/editor/kesfet";
}

export default async function EditorDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireEditorProfile("/editor/kesfet");
  const enabledFilterIds = new Set<DiscoveryFilterId>(
    await getDiscoverySurfaceFilterIds("editor-work-discovery"),
  );
  const adultAccess = await getAdultContentAccess(profile.id);
  const visibleRatings = visibleMemberContentRatings(adultAccess.canAccessAdultContent);
  const parameters = await searchParams;
  const search = enabledFilterIds.has("search")
    ? firstValue(parameters.arama).slice(0, 220) || undefined
    : undefined;
  const genre = enabledFilterIds.has("genre")
    ? normalizeGenreLabel(firstValue(parameters.tur))
    : undefined;
  const languageValue = firstValue(parameters.dil);
  const language =
    enabledFilterIds.has("language") && includesValue(languageFilters, languageValue)
      ? languageValue
      : undefined;
  const wordCountValue = firstValue(parameters.kelime);
  const wordCount =
    enabledFilterIds.has("wordCount") && includesValue(wordCountFilters, wordCountValue)
      ? wordCountValue
      : undefined;
  const reviewValue = firstValue(parameters.durum);
  const reviewStatus =
    enabledFilterIds.has("reviewStatus") && includesValue(reviewFilters, reviewValue)
      ? reviewValue
      : undefined;
  const ratingValue = firstValue(parameters.hitap);
  const requestedRating =
    enabledFilterIds.has("contentRating") && isMemberStoredWorkContentRating(ratingValue)
      ? ratingValue
      : undefined;
  const contentRating =
    requestedRating && visibleRatings.includes(requestedRating)
      ? requestedRating
      : undefined;
  const advanced = sanitizeDiscoveryAdvancedFilters(
    parseDiscoveryAdvancedFilters(parameters),
    enabledFilterIds,
  );
  const rawPage = Number.parseInt(firstValue(parameters.sayfa), 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const filters: EditorExploreFilters = {
    advanced,
    contentRating,
    genre,
    language,
    reviewStatus,
    search,
    wordCount,
  };

  const baseActiveFilters = [
    search
      ? { href: filterHref({ ...filters, search: undefined }), label: `Arama: ${search}` }
      : null,
    genre
      ? { href: filterHref({ ...filters, genre: undefined }), label: `Tür: ${genre}` }
      : null,
    contentRating
      ? {
          href: filterHref({ ...filters, contentRating: undefined }),
          label: `Yaş: ${workContentRatingDetails[contentRating].shortLabel}`,
        }
      : null,
    language
      ? {
          href: filterHref({ ...filters, language: undefined }),
          label: `Dil: ${language === "tr" ? "Türkçe" : language === "en" ? "İngilizce" : language === "de" ? "Almanca" : "Fransızca"}`,
        }
      : null,
    wordCount
      ? {
          href: filterHref({ ...filters, wordCount: undefined }),
          label: `Kelime: ${wordCountLabel(wordCount)}`,
        }
      : null,
    reviewStatus
      ? {
          href: filterHref({ ...filters, reviewStatus: undefined }),
          label: `Editör: ${reviewLabel(reviewStatus)}`,
        }
      : null,
  ].filter((item): item is { href: string; label: string } => item !== null);
  const advancedActiveFilters = discoveryAdvancedFilterChips(advanced, enabledFilterIds).map(
    (item) => ({
      href: filterHref(
        { ...filters, advanced: clearDiscoveryAdvancedFilter(advanced, item.id) },
        1,
      ),
      label: item.label,
    }),
  );
  const activeFilters = [...baseActiveFilters, ...advancedActiveFilters];
  const hasFilters = activeFilters.length > 0;

  const works = (
    await getCommonEditorDiscovery(profile.id, {
      contentRating,
      genre,
      language,
      reviewStatus,
      search,
      wordCount,
    })
  ).filter((work) =>
    matchesDiscoveryAdvancedWorkFilters(
      {
        authorName: work.authorName,
        authorUsername: work.authorUsername,
        chapterCount: work.chapterCount,
        commentCount: work.commentCount,
        completionStatus: work.completionStatus,
        favoriteCount: work.favoriteCount,
        hasPassport: work.hasPassport,
        publishedAt: work.publishedAt,
        readerCount: work.readerCount,
        updatedAt: work.updatedAt,
        versionCount: work.versionCount,
      },
      advanced,
    ),
  );
  const totalCount = works.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageWorks = works.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <DiscoveryWorkspaceHero
          description="Okur ve yayıneviyle aynı Eser Havuzu’ndaki yayımlanmış eserleri inceleyin; editör durumunu ve okur etkileşimini tek satır standardında karşılaştırın."
          eyebrow="Editör · Eser Havuzu · Keşif"
          links={[
            { current: true, href: "/editor/kesfet", label: "Eserler" },
            { href: "/editor/yazarlar", label: "Yazarlar" },
            { href: "/editor/favoriler", label: "Favoriler" },
            { href: "/editor/seckiler", label: "Seçkiler" },
          ]}
          stats={[
            { label: "Eşleşen eser", value: totalCount },
            { label: "Aktif filtre", value: activeFilters.length },
            { label: "Bu sayfada", value: pageWorks.length },
          ]}
          title="Eser Keşfet"
        />

        {adultAccess.isAdult && !adultAccess.canAccessAdultContent ? (
          <div className="editor-empty">
            <h2>18+ içerik tercihi kapalı</h2>
            <p>18+ eserleri aynı ortak Keşfet havuzunda görmek için ikinci açık onayı verin.</p>
            <Link
              className="button button--outline"
              href="/yetiskin-icerik-onayi?sonraki=%2Feditor%2Fkesfet"
            >
              18+ içerikleri aç
            </Link>
          </div>
        ) : null}

        <section className="role-filter-desk" aria-label="Editör filtre masası">
          <header className="role-filter-desk__header">
            <div>
              <span>Filtre masası</span>
              <strong>Editör için uygun eserleri daraltın</strong>
            </div>
            {hasFilters ? <Link href="/editor/kesfet">Tüm filtreleri temizle</Link> : null}
          </header>

          {enabledFilterIds.size > 0 ? (
            <form className="role-filter-desk__form">
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

              {enabledFilterIds.has("language") ? (
                <label>
                  <span>Dil</span>
                  <select defaultValue={language ?? ""} name="dil">
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
                  <select defaultValue={wordCount ?? ""} name="kelime">
                    <option value="">Tümü</option>
                    <option value="short">30.000 altı</option>
                    <option value="medium">30.000 – 80.000</option>
                    <option value="long">80.000 üzeri</option>
                  </select>
                </label>
              ) : null}

              {enabledFilterIds.has("reviewStatus") ? (
                <label>
                  <span>Editör incelemesi</span>
                  <select defaultValue={reviewStatus ?? ""} name="durum">
                    <option value="">Tümü</option>
                    <option value="not_requested">Henüz incelenmedi</option>
                    <option value="requested">Yazar görüşe açık</option>
                    <option value="in_progress">İlk editörde</option>
                    <option value="awaiting_second_editor">İkinci editör bekliyor</option>
                    <option value="second_in_progress">İkinci editörde</option>
                    <option value="completed">Tamamlandı</option>
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
                  <Link className="button button--ghost" href="/editor/kesfet">
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

          {activeFilters.length > 0 ? (
            <div className="role-filter-desk__active" aria-label="Aktif filtreler">
              <span>Aktif</span>
              {activeFilters.map((item) => (
                <Link href={item.href} key={`${item.label}-${item.href}`}>
                  {item.label}
                  <b aria-hidden="true">×</b>
                </Link>
              ))}
            </div>
          ) : enabledFilterIds.size > 0 ? (
            <p className="role-filter-desk__hint">
              Filtre seçmeden editöre açık ortak eser havuzunu görüyorsunuz.
            </p>
          ) : null}
        </section>

        <DiscoveryResultSummary
          currentPage={currentPage}
          noun="eser"
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          visibleCount={pageWorks.length}
        />

        {pageWorks.length === 0 ? (
          <div className="editor-empty">
            <h2>Eşleşen eser bulunamadı</h2>
            <p>Filtreleri değiştirerek yeniden deneyin.</p>
          </div>
        ) : (
          <EditorWorksTable currentEditorId={profile.id} works={pageWorks} />
        )}

        <DiscoveryPagination
          ariaLabel="Editör keşif sayfalama"
          currentPage={currentPage}
          hrefForPage={(page) => filterHref(filters, page)}
          totalPages={totalPages}
        />
      </div>
    </AppShell>
  );
}
