import Link from "next/link";
import type { Metadata } from "next";

import { AdvancedDiscoveryFilterFields } from "@/components/discovery/AdvancedDiscoveryFilterFields";
import {
  DiscoveryPagination,
  DiscoveryResultSummary,
} from "@/components/discovery/DiscoveryListChrome";
import "@/components/discovery/discovery-filter-desk.css";
import { AppShell } from "@/components/layout/AppShell";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { requirePublisherDiscoveryAccess } from "@/features/publisher-discovery/access";
import { PublisherWorksTable } from "@/features/publisher-discovery/components/PublisherWorksTable";
import {
  getPublisherWorkFavoriteIds,
  getPublisherWorkLikeIds,
} from "@/features/publisher-discovery/engagement-query";
import { getPublisherShareRecipientOptions } from "@/features/publisher-discovery/sharing-repository";
import {
  getPublisherWorkDiscovery,
  normalizePublisherWorkDiscoveryFilters,
  PUBLISHER_WORK_PAGE_SIZE,
  publisherWordCountLabel,
  type PublisherWorkDiscoveryFilters,
} from "@/features/publisher-discovery/work-query";
import { getActivePublisherEditorRequestWorkIds } from "@/features/publisher-editor-requests/repository";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
import { sanitizeDiscoveryAdvancedFilters } from "@/lib/discovery-advanced-filter-management";
import {
  appendDiscoveryAdvancedFilterParams,
  clearDiscoveryAdvancedFilter,
  discoveryAdvancedFilterChips,
} from "@/lib/discovery-advanced-filters";
import { getDiscoverySurfaceFilterIds } from "@/lib/discovery-filter-config";
import type { DiscoveryFilterId } from "@/lib/discovery-filter-registry";
import { GENRE_LABELS } from "@/lib/genres";
import { workContentRatingDetails } from "@/lib/work-content-classification";
import "@/features/publisher-discovery/publisher-discovery.css";
import "@/features/publisher-editor-requests/publisher-editor-requests.css";

export const metadata: Metadata = {
  description: "Yayıneviniz için herkese açık eserleri keşfedin.",
  title: "Yayınevi Eser Keşfi | İlkOku",
};

export const dynamic = "force-dynamic";

const reviewLabels = {
  awaiting_second_editor: "İkinci editör bekleniyor",
  completed: "Editör incelemesi tamamlandı",
  in_progress: "İlk editörde",
  not_requested: "Henüz incelenmedi",
  requested: "İnceleme talep edildi",
  second_in_progress: "İkinci editörde",
} as const;

function pageHref(filters: PublisherWorkDiscoveryFilters, page: number) {
  const params = new URLSearchParams();

  if (filters.query) params.set("arama", filters.query);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.language) params.set("dil", filters.language);
  if (filters.contentRating) params.set("hitap", filters.contentRating);
  if (filters.reviewStatus) params.set("editor", filters.reviewStatus);
  if (filters.sort !== "newest") params.set("siralama", filters.sort);
  if (filters.wordCount) params.set("kelime", filters.wordCount);
  appendDiscoveryAdvancedFilterParams(params, filters.advanced);
  if (page > 1) params.set("sayfa", String(page));

  const query = params.toString();
  return query
    ? `/yayinevi/kesfet/eserler?${query}`
    : "/yayinevi/kesfet/eserler";
}

export default async function PublisherWorkDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePublisherDiscoveryAccess(
    "/yayinevi/kesfet/eserler",
    "discover_works",
  );
  const enabledFilterIds = new Set<DiscoveryFilterId>(
    await getDiscoverySurfaceFilterIds("publisher-work-discovery"),
  );
  const adultAccess = access.profile.adminPublisherView
    ? {
        canAccessAdultContent: true,
        isAdult: true,
      }
    : await getAdultContentAccess(access.profile.id);
  const visibleRatings = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const filters = normalizePublisherWorkDiscoveryFilters(await searchParams);
  if (!enabledFilterIds.has("search")) filters.query = "";
  if (!enabledFilterIds.has("genre")) filters.genre = "";
  if (!enabledFilterIds.has("language")) filters.language = "";
  if (!enabledFilterIds.has("contentRating")) filters.contentRating = "";
  if (!enabledFilterIds.has("reviewStatus")) filters.reviewStatus = "";
  if (!enabledFilterIds.has("sort")) filters.sort = "newest";
  if (!enabledFilterIds.has("wordCount")) filters.wordCount = undefined;
  filters.advanced = sanitizeDiscoveryAdvancedFilters(
    filters.advanced,
    enabledFilterIds,
  );
  if (
    filters.contentRating === "adult_18" &&
    !adultAccess.canAccessAdultContent
  ) {
    filters.contentRating = "";
  }
  const data = await getPublisherWorkDiscovery(
    filters,
    adultAccess.canAccessAdultContent,
  );
  const workIds = data.rows.map((row) => row.id);
  const [
    likedWorkIds,
    favoriteWorkIds,
    shareMembers,
    activeEditorRequestWorkIds,
  ] = await Promise.all([
    getPublisherWorkLikeIds(access.publisherId, workIds),
    getPublisherWorkFavoriteIds(access.publisherId, workIds),
    getPublisherShareRecipientOptions(access.profile.id),
    getActivePublisherEditorRequestWorkIds(access.publisherId, workIds),
  ]);
  const canMutate = !access.profile.adminPublisherView;
  const canLike = canMutate && access.permissions.includes("like_work");
  const canFavorite =
    canMutate && access.permissions.includes("favorite_work");
  const canRequestEditorReview =
    canMutate && access.permissions.includes("request_editor_review");
  const canShareInternal =
    canMutate && access.permissions.includes("share_internal");
  const canShareEmail =
    canMutate && access.permissions.includes("share_email");
  const activeFilters = [
    filters.query
      ? {
          href: pageHref({ ...filters, query: "" }, 1),
          label: `Arama: ${filters.query}`,
        }
      : null,
    filters.genre
      ? {
          href: pageHref({ ...filters, genre: "" }, 1),
          label: `Tür: ${filters.genre}`,
        }
      : null,
    filters.contentRating
      ? {
          href: pageHref({ ...filters, contentRating: "" }, 1),
          label: `Yaş: ${workContentRatingDetails[filters.contentRating].shortLabel}`,
        }
      : null,
    filters.language
      ? {
          href: pageHref({ ...filters, language: "" }, 1),
          label: filters.language === "tr" ? "Dil: Türkçe" : `Dil: ${filters.language.toLocaleUpperCase("tr-TR")}`,
        }
      : null,
    filters.reviewStatus
      ? {
          href: pageHref({ ...filters, reviewStatus: "" }, 1),
          label: `Editör: ${reviewLabels[filters.reviewStatus]}`,
        }
      : null,
    filters.sort !== "newest"
      ? {
          href: pageHref({ ...filters, sort: "newest" }, 1),
          label: "Sıralama: Son güncellenen",
        }
      : null,
    filters.wordCount
      ? {
          href: pageHref({ ...filters, wordCount: undefined }, 1),
          label: `Kelime: ${publisherWordCountLabel(filters.wordCount)}`,
        }
      : null,
  ].filter((item): item is { href: string; label: string } => item !== null);
  const advancedFilters = discoveryAdvancedFilterChips(
    filters.advanced,
    enabledFilterIds,
  ).map((item) => ({
    href: pageHref(
      {
        ...filters,
        advanced: clearDiscoveryAdvancedFilter(filters.advanced, item.id),
      },
      1,
    ),
    label: item.label,
  }));
  const visibleActiveFilters = [...activeFilters, ...advancedFilters];
  const hasFilters = visibleActiveFilters.length > 0;
  const canViewPassport = access.permissions.includes(
    "view_authorized_passport",
  );
  const returnTo = pageHref(filters, data.currentPage);

  return (
    <AppShell profile={access.profile}>
      <div className="publisher-discovery">
        <EditorPageHeader
          description="Okuyucu ve editörlerle aynı ortak Keşfet havuzundaki eserleri inceleyin; yetkinize göre beğenin, favorileyin, paylaşın ve Eser Pasaportu'nu açın."
          eyebrow={access.companyName}
          title="Eser Keşfet"
        />

        {adultAccess.isAdult && !adultAccess.canAccessAdultContent ? (
          <section className="publisher-discovery-summary">
            <div>
              <span>18+ içerik tercihi</span>
              <strong>İkinci onay gerekli</strong>
            </div>
            <p>
              18+ eserleri aynı ortak Keşfet havuzunda görmek için açık onay verin.
            </p>
            <Link
              className="button button--outline"
              href="/yetiskin-icerik-onayi?sonraki=%2Fyayinevi%2Fkesfet%2Feserler"
            >
              18+ içerikleri aç
            </Link>
          </section>
        ) : null}

        <section className="role-filter-desk" aria-label="Yayınevi eser filtre masası">
          <header className="role-filter-desk__header">
            <div>
              <span>Filtre masası</span>
              <strong>Yayınevi için uygun eserleri daraltın</strong>
            </div>
            {hasFilters ? (
              <Link href="/yayinevi/kesfet/eserler">Tüm filtreleri temizle</Link>
            ) : null}
          </header>

          {enabledFilterIds.size > 0 ? (
            <form className="role-filter-desk__form" method="get">
              {enabledFilterIds.has("search") ? (
                <label className="role-filter-field--search">
                  <span>Arama</span>
                  <input
                    defaultValue={filters.query}
                    name="arama"
                    placeholder="Eser adı veya yazar"
                    type="search"
                  />
                </label>
              ) : null}

              {enabledFilterIds.has("genre") ? (
                <label>
                  <span>Tür</span>
                  <select defaultValue={filters.genre} name="tur">
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
                  <select defaultValue={filters.contentRating} name="hitap">
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
                  <select defaultValue={filters.language} name="dil">
                    <option value="">Tüm diller</option>
                    <option value="tr">Türkçe</option>
                    <option value="en">İngilizce</option>
                    <option value="de">Almanca</option>
                    <option value="fr">Fransızca</option>
                  </select>
                </label>
              ) : null}

              {enabledFilterIds.has("reviewStatus") ? (
                <label>
                  <span>Editör incelemesi</span>
                  <select defaultValue={filters.reviewStatus} name="editor">
                    <option value="">Tümü</option>
                    {Object.entries(reviewLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {enabledFilterIds.has("sort") ? (
                <label>
                  <span>Sıralama</span>
                  <select defaultValue={filters.sort} name="siralama">
                    <option value="newest">En yeni yayımlanan</option>
                    <option value="updated">Son güncellenen</option>
                  </select>
                </label>
              ) : null}

              {enabledFilterIds.has("wordCount") ? (
                <label>
                  <span>Kelime sayısı</span>
                  <select defaultValue={filters.wordCount ?? ""} name="kelime">
                    <option value="">Tümü</option>
                    <option value="short">30.000 altı</option>
                    <option value="medium">30.000 – 80.000</option>
                    <option value="long">80.000 üzeri</option>
                  </select>
                </label>
              ) : null}

              <AdvancedDiscoveryFilterFields
                enabledFilterIds={enabledFilterIds}
                filters={filters.advanced}
              />

              <div className="role-filter-desk__actions">
                <button className="button button--primary" type="submit">
                  Masayı Güncelle
                </button>
                {hasFilters ? (
                  <Link className="button button--ghost" href="/yayinevi/kesfet/eserler">
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

          {visibleActiveFilters.length > 0 ? (
            <div className="role-filter-desk__active" aria-label="Aktif filtreler">
              <span>Aktif</span>
              {visibleActiveFilters.map((item) => (
                <Link href={item.href} key={`${item.label}-${item.href}`}>
                  {item.label}
                  <b aria-hidden="true">×</b>
                </Link>
              ))}
            </div>
          ) : enabledFilterIds.size > 0 ? (
            <p className="role-filter-desk__hint">
              Filtre seçmeden yayınevine açık ortak eser havuzunu görüyorsunuz.
            </p>
          ) : null}
        </section>

        <DiscoveryResultSummary
          currentPage={data.currentPage}
          noun="eser"
          pageSize={PUBLISHER_WORK_PAGE_SIZE}
          totalCount={data.totalCount}
          visibleCount={data.rows.length}
        />

        {data.rows.length === 0 ? (
          <section className="publisher-discovery-empty">
            <h2>Eşleşen eser bulunamadı</h2>
            <p>Arama veya filtreleri değiştirerek yeniden deneyin.</p>
          </section>
        ) : (
          <PublisherWorksTable
            activeEditorRequestWorkIds={activeEditorRequestWorkIds}
            canFavorite={canFavorite}
            canLike={canLike}
            canRequestEditorReview={canRequestEditorReview}
            canShareEmail={canShareEmail}
            canShareInternal={canShareInternal}
            canViewPassport={canViewPassport}
            favoriteWorkIds={favoriteWorkIds}
            likedWorkIds={likedWorkIds}
            returnTo={returnTo}
            rows={data.rows}
            shareMembers={shareMembers}
          />
        )}

        <DiscoveryPagination
          ariaLabel="Eser sayfalama"
          currentPage={data.currentPage}
          hrefForPage={(page) => pageHref(filters, page)}
          totalPages={data.totalPages}
        />
      </div>
    </AppShell>
  );
}
