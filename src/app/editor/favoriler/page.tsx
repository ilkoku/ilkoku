import Link from "next/link";
import type { Metadata } from "next";

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
} from "@/features/editor-workspace/collection-query";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { EditorWorkCard } from "@/features/editor-workspace/components/EditorWorkCard";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
import { getDiscoverySurfaceFilterIds } from "@/lib/discovery-filter-config";
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

function includesReviewStatus(value: string | undefined): value is EditorCollectionReviewStatus {
  return Boolean(
    value && reviewStatuses.includes(value as EditorCollectionReviewStatus),
  );
}

function reviewLabel(value: EditorCollectionReviewStatus) {
  if (value === "completed") return "İncelendi";
  if (value === "second_in_progress") return "İkinci editörde";
  if (value === "awaiting_second_editor") return "İkinci editör bekleniyor";
  if (value === "in_progress") return "İlk editörde";
  if (value === "requested") return "İnceleme talep edildi";
  return "Henüz incelenmedi";
}

function pageHref(filters: Omit<EditorCollectionFilters, "page">, page = 1) {
  const params = new URLSearchParams();
  if (filters.search) params.set("arama", filters.search);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.contentRating) params.set("hitap", filters.contentRating);
  if (filters.reviewStatus) params.set("durum", filters.reviewStatus);
  if (page > 1) params.set("sayfa", String(page));
  const query = params.toString();
  return query ? `/editor/favoriler?${query}` : "/editor/favoriler";
}

export default async function EditorFavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{
    arama?: string;
    durum?: string;
    hitap?: string;
    sayfa?: string;
    tur?: string;
  }>;
}) {
  const profile = await requireEditorProfile("/editor/favoriler");
  const enabledFilterIds = new Set(
    await getDiscoverySurfaceFilterIds("editor-favorites"),
  );
  const adultAccess = await getAdultContentAccess(profile.id);
  const visibleRatings = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const params = await searchParams;
  const search = enabledFilterIds.has("search")
    ? params.arama?.trim().slice(0, 220) || undefined
    : undefined;
  const genre = enabledFilterIds.has("genre")
    ? normalizeGenreLabel(params.tur)
    : undefined;
  const requestedRating =
    enabledFilterIds.has("contentRating") && isMemberStoredWorkContentRating(params.hitap)
      ? params.hitap
      : undefined;
  const contentRating: MemberStoredWorkContentRating | undefined =
    requestedRating && visibleRatings.includes(requestedRating)
      ? requestedRating
      : undefined;
  const reviewStatus =
    enabledFilterIds.has("reviewStatus") && includesReviewStatus(params.durum)
      ? params.durum
      : undefined;
  const rawPage = Number.parseInt(params.sayfa ?? "", 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const filters: EditorCollectionFilters = {
    contentRating,
    genre,
    page: requestedPage,
    reviewStatus,
    search,
  };
  const hrefFilters = {
    contentRating,
    genre,
    reviewStatus,
    search,
  };
  const data = await getEditorFavoriteCollection(
    profile.id,
    filters,
    adultAccess.canAccessAdultContent,
  );
  const activeFilters = [
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
  ].filter((item): item is { href: string; label: string } => item !== null);
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
