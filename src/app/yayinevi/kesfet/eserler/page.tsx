import Link from "next/link";
import type { Metadata } from "next";

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
  type PublisherWorkDiscoveryFilters,
} from "@/features/publisher-discovery/work-query";
import { getActivePublisherEditorRequestWorkIds } from "@/features/publisher-editor-requests/repository";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
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
  if (filters.completion) params.set("tamamlanma", filters.completion);
  if (filters.reviewStatus) params.set("editor", filters.reviewStatus);
  if (filters.sort !== "newest") params.set("siralama", filters.sort);
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
  const hasFilters = Boolean(
    filters.query ||
      filters.genre ||
      filters.language ||
      filters.contentRating ||
      filters.completion ||
      filters.reviewStatus ||
      filters.sort !== "newest",
  );
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

        <form className="publisher-discovery-filters" method="get">
          <label>
            <span>Eser veya yazar ara</span>
            <input
              defaultValue={filters.query}
              name="arama"
              placeholder="Eser adı veya yazar"
              type="search"
            />
          </label>

          <label>
            <span>Tür</span>
            <select defaultValue={filters.genre} name="tur">
              <option value="">Tümü</option>
              {GENRE_LABELS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Dil</span>
            <select defaultValue={filters.language} name="dil">
              <option value="">Tümü</option>
              <option value="tr">Türkçe</option>
              <option value="en">İngilizce</option>
            </select>
          </label>

          <label>
            <span>Hitap yaşı</span>
            <select defaultValue={filters.contentRating} name="hitap">
              <option value="">Tümü</option>
              {visibleRatings.map((rating) => (
                <option key={rating} value={rating}>
                  {workContentRatingDetails[rating].label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Tamamlanma</span>
            <select defaultValue={filters.completion} name="tamamlanma">
              <option value="">Tümü</option>
              <option value="completed">Tamamlandı</option>
              <option value="ongoing">Devam ediyor</option>
            </select>
          </label>

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

          <label>
            <span>Sıralama</span>
            <select defaultValue={filters.sort} name="siralama">
              <option value="newest">En yeni yayımlanan</option>
              <option value="updated">Son güncellenen</option>
            </select>
          </label>

          <div className="publisher-discovery-filter-actions">
            <button className="button button--primary" type="submit">
              Filtrele
            </button>

            {hasFilters ? (
              <Link
                className="button button--ghost"
                href="/yayinevi/kesfet/eserler"
              >
                Temizle
              </Link>
            ) : null}
          </div>
        </form>

        <section className="publisher-discovery-summary">
          <div>
            <span>Keşif sonucu</span>
            <strong>{data.totalCount} eser</strong>
          </div>
          <p>
            Beğeni, favori, paylaşım ve editör talebi işlemleri yayınevi adına kaydedilir ve üyeye atanmış yetkilere göre açılır.
          </p>
        </section>

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

        <footer
          aria-label="Eser sayfalama"
          className="publisher-discovery-pagination"
        >
          <span>
            {data.totalCount} eserden {data.first}–{data.last} arası gösteriliyor.
          </span>

          <div>
            {data.currentPage > 1 ? (
              <Link
                className="button button--ghost"
                href={pageHref(filters, data.currentPage - 1)}
              >
                Önceki
              </Link>
            ) : null}

            <strong>
              {data.currentPage} / {data.totalPages}
            </strong>

            {data.currentPage < data.totalPages ? (
              <Link
                className="button button--ghost"
                href={pageHref(filters, data.currentPage + 1)}
              >
                Sonraki
              </Link>
            ) : null}
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
