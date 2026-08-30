import type { DiscoveryAdvancedFilters } from "@/lib/discovery-advanced-filters";
import type { DiscoveryFilterId } from "@/lib/discovery-filter-registry";

function enabled(
  filters: ReadonlySet<DiscoveryFilterId> | readonly DiscoveryFilterId[],
  id: DiscoveryFilterId,
) {
  return new Set<DiscoveryFilterId>(filters).has(id);
}

function RangeField({
  label,
  max,
  maxName,
  min,
  minName,
  upperLimit,
}: {
  label: string;
  max?: number;
  maxName: string;
  min?: number;
  minName: string;
  upperLimit?: number;
}) {
  return (
    <label className="role-filter-field--range">
      <span>{label}</span>
      <span className="role-filter-range-inputs">
        <input
          defaultValue={min}
          max={upperLimit}
          min={0}
          name={minName}
          placeholder="En az"
          type="number"
        />
        <input
          defaultValue={max}
          max={upperLimit}
          min={0}
          name={maxName}
          placeholder="En çok"
          type="number"
        />
      </span>
    </label>
  );
}

function DateRangeField({
  from,
  fromName,
  label,
  to,
  toName,
}: {
  from?: string;
  fromName: string;
  label: string;
  to?: string;
  toName: string;
}) {
  return (
    <label className="role-filter-field--range">
      <span>{label}</span>
      <span className="role-filter-range-inputs">
        <input aria-label={`${label} başlangıç`} defaultValue={from} name={fromName} type="date" />
        <input aria-label={`${label} bitiş`} defaultValue={to} name={toName} type="date" />
      </span>
    </label>
  );
}

export function AdvancedDiscoveryFilterFields({
  enabledFilterIds,
  filters,
}: {
  enabledFilterIds: ReadonlySet<DiscoveryFilterId> | readonly DiscoveryFilterId[];
  filters: DiscoveryAdvancedFilters;
}) {
  return (
    <>
      {enabled(enabledFilterIds, "author") ? (
        <label>
          <span>Yazar</span>
          <input defaultValue={filters.author} name="yazar" placeholder="Yazar adı veya rumuz" />
        </label>
      ) : null}

      {enabled(enabledFilterIds, "completionStatus") ? (
        <label>
          <span>Eser tamamlanma durumu</span>
          <select defaultValue={filters.completionStatus ?? ""} name="tamamlanma">
            <option value="">Tümü</option>
            <option value="ongoing">Devam ediyor</option>
            <option value="completed">Tamamlandı</option>
          </select>
        </label>
      ) : null}

      {enabled(enabledFilterIds, "chapterCount") ? (
        <RangeField
          label="Bölüm sayısı"
          max={filters.chapterMax}
          maxName="bolumMax"
          min={filters.chapterMin}
          minName="bolumMin"
        />
      ) : null}

      {enabled(enabledFilterIds, "readerCount") ? (
        <RangeField
          label="Okur sayısı"
          max={filters.readerMax}
          maxName="okurMax"
          min={filters.readerMin}
          minName="okurMin"
        />
      ) : null}

      {enabled(enabledFilterIds, "favoriteCount") ? (
        <RangeField
          label="Favori / beğeni sayısı"
          max={filters.favoriteMax}
          maxName="favoriMax"
          min={filters.favoriteMin}
          minName="favoriMin"
        />
      ) : null}

      {enabled(enabledFilterIds, "commentCount") ? (
        <RangeField
          label="Yorum sayısı"
          max={filters.commentMax}
          maxName="yorumMax"
          min={filters.commentMin}
          minName="yorumMin"
        />
      ) : null}

      {enabled(enabledFilterIds, "hasPassport") ? (
        <label>
          <span>Eser Pasaportu</span>
          <select defaultValue={filters.hasPassport ?? ""} name="pasaport">
            <option value="">Tümü</option>
            <option value="yes">Pasaport var</option>
            <option value="no">Pasaport yok</option>
          </select>
        </label>
      ) : null}

      {enabled(enabledFilterIds, "versionCount") ? (
        <RangeField
          label="Versiyon sayısı"
          max={filters.versionMax}
          maxName="versiyonMax"
          min={filters.versionMin}
          minName="versiyonMin"
        />
      ) : null}

      {enabled(enabledFilterIds, "publishedAt") ? (
        <DateRangeField
          from={filters.publishedFrom}
          fromName="yayinBaslangic"
          label="Yayımlanma tarihi"
          to={filters.publishedTo}
          toName="yayinBitis"
        />
      ) : null}

      {enabled(enabledFilterIds, "updatedAt") ? (
        <DateRangeField
          from={filters.updatedFrom}
          fromName="guncellemeBaslangic"
          label="Son güncelleme tarihi"
          to={filters.updatedTo}
          toName="guncellemeBitis"
        />
      ) : null}

      {enabled(enabledFilterIds, "readingProgress") ? (
        <RangeField
          label="Okuma ilerlemesi (%)"
          max={filters.readingProgressMax}
          maxName="ilerlemeMax"
          min={filters.readingProgressMin}
          minName="ilerlemeMin"
          upperLimit={100}
        />
      ) : null}

      {enabled(enabledFilterIds, "readingState") ? (
        <label>
          <span>Eser okuma durumu</span>
          <select defaultValue={filters.readingState ?? ""} name="okumaDurumu">
            <option value="">Tümü</option>
            <option value="unread">Okunmadı</option>
            <option value="in_progress">Devam ediyor</option>
            <option value="completed">Tamamlandı</option>
          </select>
        </label>
      ) : null}

      {enabled(enabledFilterIds, "lastReadAt") ? (
        <DateRangeField
          from={filters.lastReadFrom}
          fromName="sonOkumaBaslangic"
          label="Son okuma tarihi"
          to={filters.lastReadTo}
          toName="sonOkumaBitis"
        />
      ) : null}

      {enabled(enabledFilterIds, "favoriteState") ? (
        <label>
          <span>Favori durumu</span>
          <select defaultValue={filters.favoriteState ?? ""} name="favoriDurumu">
            <option value="">Tümü</option>
            <option value="yes">Favorilerimde</option>
            <option value="no">Favorilerimde değil</option>
          </select>
        </label>
      ) : null}

      {enabled(enabledFilterIds, "country") ? (
        <label>
          <span>Ülke</span>
          <input defaultValue={filters.country} name="ulke" placeholder="Örn. Türkiye" />
        </label>
      ) : null}

      {enabled(enabledFilterIds, "authorPublicWorkCount") ? (
        <RangeField
          label="Yazar public eser sayısı"
          max={filters.authorPublicWorkMax}
          maxName="eserMax"
          min={filters.authorPublicWorkMin}
          minName="eserMin"
        />
      ) : null}

      {enabled(enabledFilterIds, "authorCompletedWorkCount") ? (
        <RangeField
          label="Yazar tamamlanan eser sayısı"
          max={filters.authorCompletedWorkMax}
          maxName="tamamlananEserMax"
          min={filters.authorCompletedWorkMin}
          minName="tamamlananEserMin"
        />
      ) : null}

      {enabled(enabledFilterIds, "authorReviewedWorkCount") ? (
        <RangeField
          label="Yazar editörden geçen eser sayısı"
          max={filters.authorReviewedWorkMax}
          maxName="incelenenEserMax"
          min={filters.authorReviewedWorkMin}
          minName="incelenenEserMin"
        />
      ) : null}

      {enabled(enabledFilterIds, "authorReaderCount") ? (
        <RangeField
          label="Yazar toplam okur sayısı"
          max={filters.authorReaderMax}
          maxName="yazarOkurMax"
          min={filters.authorReaderMin}
          minName="yazarOkurMin"
        />
      ) : null}

      {enabled(enabledFilterIds, "authorFavoriteCount") ? (
        <RangeField
          label="Yazar toplam favori sayısı"
          max={filters.authorFavoriteMax}
          maxName="yazarFavoriMax"
          min={filters.authorFavoriteMin}
          minName="yazarFavoriMin"
        />
      ) : null}

      {enabled(enabledFilterIds, "authorCommentCount") ? (
        <RangeField
          label="Yazar toplam yorum sayısı"
          max={filters.authorCommentMax}
          maxName="yazarYorumMax"
          min={filters.authorCommentMin}
          minName="yazarYorumMin"
        />
      ) : null}
    </>
  );
}
