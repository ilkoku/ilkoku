import Link from "next/link";

import { AdvancedDiscoveryFilterFields } from "@/components/discovery/AdvancedDiscoveryFilterFields";
import "@/components/discovery/discovery-filter-desk.css";
import type { DiscoveryAdvancedFilters } from "@/lib/discovery-advanced-filters";
import { getDiscoverySurfaceFilterIds } from "@/lib/discovery-filter-config";
import { GENRE_LABELS } from "@/lib/genres";
import {
  workContentRatingDetails,
  type StoredWorkContentRating,
} from "@/lib/work-content-classification";

export type PublisherCollectionActiveFilter = {
  href: string;
  label: string;
};

export type PublisherCollectionKind = "author" | "work";

export const publisherCollectionReviewStatuses = [
  "not_requested",
  "requested",
  "in_progress",
  "awaiting_second_editor",
  "second_in_progress",
  "completed",
] as const;

export type PublisherCollectionReviewStatus =
  (typeof publisherCollectionReviewStatuses)[number];

export function publisherCollectionReviewLabel(
  value: PublisherCollectionReviewStatus,
) {
  if (value === "completed") return "İncelendi";
  if (value === "second_in_progress") return "İkinci editörde";
  if (value === "awaiting_second_editor") return "İkinci editör bekleniyor";
  if (value === "in_progress") return "İlk editörde";
  if (value === "requested") return "İnceleme talep edildi";
  return "Henüz incelenmedi";
}

export const publisherCollectionWordCountFilters = [
  "short",
  "medium",
  "long",
] as const;
export type PublisherCollectionWordCountFilter =
  (typeof publisherCollectionWordCountFilters)[number];

export function publisherCollectionWordCountLabel(
  value: PublisherCollectionWordCountFilter,
) {
  if (value === "short") return "30.000 altı";
  if (value === "medium") return "30.000 – 80.000";
  return "80.000 üzeri";
}

function inferPublisherSurfaceId(clearHref: string, kind: PublisherCollectionKind) {
  if (clearHref.startsWith("/yayinevi/takip-ettiklerim")) {
    return "publisher-following-authors";
  }
  if (clearHref.startsWith("/yayinevi/favorilerim")) {
    return kind === "author"
      ? "publisher-favorite-authors"
      : "publisher-favorite-works";
  }
  return kind === "author"
    ? "publisher-liked-authors"
    : "publisher-liked-works";
}

export async function PublisherCollectionFilterDesk({
  activeFilters,
  advancedFilters,
  city,
  clearHref,
  contentRating,
  genre,
  heading,
  hiddenFields = [],
  hint,
  kind,
  language,
  query,
  ratingOptions,
  reviewStatus,
  wordCount,
}: {
  activeFilters: PublisherCollectionActiveFilter[];
  advancedFilters: DiscoveryAdvancedFilters;
  city?: string;
  clearHref: string;
  contentRating?: string;
  genre?: string;
  heading: string;
  hiddenFields?: Array<{ name: string; value: string }>;
  hint: string;
  kind: PublisherCollectionKind;
  language?: string;
  query?: string;
  ratingOptions: readonly StoredWorkContentRating[];
  reviewStatus?: PublisherCollectionReviewStatus;
  wordCount?: PublisherCollectionWordCountFilter;
}) {
  const hasFilters = activeFilters.length > 0;
  const enabledFilterIds = new Set(
    await getDiscoverySurfaceFilterIds(inferPublisherSurfaceId(clearHref, kind)),
  );
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
                defaultValue={query}
                name="arama"
                placeholder={
                  kind === "work"
                    ? "Eser, yazar veya rumuz ara"
                    : "Yazar, public kimlik veya eser ara"
                }
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
              <select defaultValue={contentRating ?? ""} name="hitap">
                <option value="">Tüm yaşlar</option>
                {ratingOptions.map((rating) => (
                  <option key={rating} value={rating}>
                    {workContentRatingDetails[rating].label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {kind === "work" && enabledFilterIds.has("reviewStatus") ? (
            <label>
              <span>Editör durumu</span>
              <select defaultValue={reviewStatus ?? ""} name="editor">
                <option value="">Tümü</option>
                {publisherCollectionReviewStatuses.map((status) => (
                  <option key={status} value={status}>
                    {publisherCollectionReviewLabel(status)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {kind === "work" && enabledFilterIds.has("language") ? (
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

          {kind === "work" && enabledFilterIds.has("wordCount") ? (
            <label>
              <span>Kelime sayısı</span>
              <select defaultValue={wordCount ?? ""} name="kelime">
                <option value="">Tümü</option>
                {publisherCollectionWordCountFilters.map((value) => (
                  <option key={value} value={value}>
                    {publisherCollectionWordCountLabel(value)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {kind === "author" && enabledFilterIds.has("city") ? (
            <label>
              <span>Şehir</span>
              <input defaultValue={city} name="sehir" placeholder="Örn. İstanbul" />
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
          {activeFilters.map((item) => (
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
