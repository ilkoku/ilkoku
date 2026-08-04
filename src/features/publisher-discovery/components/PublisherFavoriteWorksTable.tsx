import Link from "next/link";

import { togglePublisherWorkFavoriteAction } from "../engagement-extended-actions";
import type { PublisherFavoriteWorkRow } from "../work-favorites-query";

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function reviewLabel(value: string) {
  const labels: Record<string, string> = {
    awaiting_second_editor: "İkinci editör bekleniyor",
    completed: "Editör incelemesi tamamlandı",
    in_progress: "İlk editörde",
    not_requested: "Henüz incelenmedi",
    requested: "İnceleme talep edildi",
    second_in_progress: "İkinci editörde",
  };

  return labels[value] ?? value;
}

export function PublisherFavoriteWorksTable({
  canMutate,
  canViewPassport,
  returnTo,
  rows,
}: {
  canMutate: boolean;
  canViewPassport: boolean;
  returnTo: string;
  rows: PublisherFavoriteWorkRow[];
}) {
  return (
    <div className="publisher-discovery-table-wrap">
      <table className="publisher-discovery-table">
        <thead>
          <tr>
            <th>Eser</th>
            <th>Yazar</th>
            <th>Tür / Dil</th>
            <th>Yayın ve editör</th>
            <th>Metrikler</th>
            <th>Favori tarihi</th>
            <th>İşlemler</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((work) => (
            <tr key={work.favoriteId}>
              <td data-label="Eser">
                <div className="publisher-discovery-table__work">
                  <span
                    aria-hidden="true"
                    className="publisher-discovery-table__cover"
                  >
                    {work.title
                      .trim()
                      .charAt(0)
                      .toLocaleUpperCase("tr-TR") || "E"}
                  </span>

                  <div>
                    <Link
                      className="publisher-saved-list__title"
                      href={`/kitap/${work.slug}?from=${encodeURIComponent(returnTo)}`}
                    >
                      {work.title}
                    </Link>
                    {work.subtitle ? <small>{work.subtitle}</small> : null}
                    <small>{work.chapterCount} yayımlanmış bölüm</small>
                  </div>
                </div>
              </td>

              <td data-label="Yazar">
                <strong>{work.authorName}</strong>
                <small>{work.authorAlias}</small>
              </td>

              <td data-label="Tür / Dil">
                <span>{work.genre || "Tür belirtilmedi"}</span>
                <small>
                  {work.language === "tr"
                    ? "Türkçe"
                    : work.language === "en"
                      ? "İngilizce"
                      : work.language.toLocaleUpperCase("tr-TR")}
                </small>
              </td>

              <td data-label="Yayın ve editör">
                <span>{reviewLabel(work.editorReviewStatus)}</span>
                <small>Yayımlanma: {formatDate(work.publishedAt)}</small>
              </td>

              <td data-label="Metrikler">
                <div className="publisher-discovery-table__metrics">
                  <span>{formatNumber(work.readerCount)} okur</span>
                  <span>{formatNumber(work.favoriteCount)} okur favorisi</span>
                  <span>{formatNumber(work.commentCount)} yorum</span>
                </div>
              </td>

              <td data-label="Favori tarihi">
                <strong>{formatDate(work.favoritedAt)}</strong>
                <small>{work.versionCount} sürüm</small>
              </td>

              <td data-label="İşlemler">
                <div className="publisher-discovery-table__actions">
                  {work.firstChapterPosition !== null ? (
                    <Link
                      className="button button--primary"
                      href={`/oku/${work.slug}/bolum-${work.firstChapterPosition}?from=${encodeURIComponent(returnTo)}`}
                    >
                      Okumaya Başla
                    </Link>
                  ) : null}

                  <Link
                    className="button button--outline"
                    href={`/kitap/${work.slug}?from=${encodeURIComponent(returnTo)}`}
                  >
                    Eser sayfası
                  </Link>

                  {canViewPassport && work.hasPassportRecord ? (
                    <Link
                      className="button button--outline"
                      href={`/yayinevi/kesfet/eserler/${work.id}/pasaport`}
                    >
                      Eser Pasaportu
                    </Link>
                  ) : null}

                  {canMutate ? (
                    <form
                      action={togglePublisherWorkFavoriteAction}
                      className="publisher-discovery-engagement-form"
                    >
                      <input name="workId" type="hidden" value={work.id} />
                      <input name="active" type="hidden" value="false" />
                      <input
                        name="returnPath"
                        type="hidden"
                        value={returnTo}
                      />
                      <button
                        className="button button--outline"
                        type="submit"
                      >
                        Favoriden çıkar
                      </button>
                    </form>
                  ) : (
                    <span className="publisher-discovery-table__permission">
                      Salt okunur
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
