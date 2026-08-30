import Link from "next/link";

import "@/components/discovery/discovery-filter-desk.css";
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

export function PublisherCollectionFilterDesk({
  activeFilters,
  city,
  clearHref,
  contentRating,
  genre,
  heading,
  hiddenFields = [],
  hint,
  kind,
  query,
  ratingOptions,
  reviewStatus,
}: {
  activeFilters: PublisherCollectionActiveFilter[];
  city?: string;
  clearHref: string;
  contentRating?: string;
  genre?: string;
  heading: string;
  hiddenFields?: Array<{ name: string; value: string }>;
  hint: string;
  kind: PublisherCollectionKind;
  query?: string;
  ratingOptions: readonly StoredWorkContentRating[];
  reviewStatus?: PublisherCollectionReviewStatus;
}) {
  const hasFilters = activeFilters.length > 0;

  return (
    <section aria-label="Filtre masası" className="role-filter-desk">
      <header className="role-filter-desk__header">
        <div>
          <span>Filtre masası</span>
          <strong>{heading}</strong>
        </div>
        {hasFilters ? <Link href={clearHref}>Tüm filtreleri temizle</Link> : null}
      </header>

      <form className="role-filter-desk__form" method="get">
        {hiddenFields.map((field) => (
          <input key={field.name} name={field.name} type="hidden" value={field.value} />
        ))}

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

        {kind === "work" ? (
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
        ) : (
          <label>
            <span>Şehir</span>
            <input defaultValue={city} name="sehir" placeholder="Örn. İstanbul" />
          </label>
        )}

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
      ) : (
        <p className="role-filter-desk__hint">{hint}</p>
      )}
    </section>
  );
}
