import Link from "next/link";
import { togglePublisherWorkLikeAction } from "../engagement-actions";

import type {
  PublisherWorkDiscoveryRow,
} from "../work-query";

const reviewLabels = {
  awaiting_second_editor:
    "İkinci editör bekleniyor",
  completed:
    "Editör incelemesi tamamlandı",
  in_progress:
    "İlk editörde",
  not_requested:
    "Henüz incelenmedi",
  requested:
    "İnceleme talep edildi",
  second_in_progress:
    "İkinci editörde",
} as const;

function languageLabel(value: string) {
  if (value === "tr") return "Türkçe";
  if (value === "en") return "İngilizce";
  return value.toLocaleUpperCase("tr-TR");
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

export function PublisherWorksTable({
  canLike,
  canViewPassport,
  likedWorkIds,
  returnTo,
  rows,
}: {
  canLike: boolean;
  canViewPassport: boolean;
  likedWorkIds: string[];
  returnTo: string;
  rows: PublisherWorkDiscoveryRow[];
}) {
  const liked = new Set(likedWorkIds);
  return (
    <div className="publisher-discovery-table-wrap">
      <table className="publisher-discovery-table">
        <thead>
          <tr>
            <th>Eser</th>
            <th>Yazar</th>
            <th>Tür / Dil</th>
            <th>Durum</th>
            <th>Editör</th>
            <th>Metrikler</th>
            <th>Pasaport</th>
            <th>İşlemler</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((work) => (
            <tr key={work.id}>
              <td data-label="Eser">
                <div className="publisher-discovery-table__work">
                  <span
                    aria-hidden="true"
                    className="publisher-discovery-table__cover"
                  >
                    {work.title
                      .trim()
                      .charAt(0)
                      .toLocaleUpperCase("tr-TR") ||
                      "E"}
                  </span>

                  <div>
                    <strong>{work.title}</strong>
                    {work.subtitle ? (
                      <small>
                        {work.subtitle}
                      </small>
                    ) : null}
                    <small>
                      {dateLabel(
                        work.publishedAt,
                      )}
                    </small>
                  </div>
                </div>
              </td>

              <td data-label="Yazar">
                <strong>
                  {work.authorName}
                </strong>
                <small>
                  {work.authorAlias}
                </small>
              </td>

              <td data-label="Tür / Dil">
                <span>
                  {work.genre ||
                    "Tür belirtilmedi"}
                </span>
                <small>
                  {languageLabel(
                    work.language,
                  )}
                </small>
              </td>

              <td data-label="Durum">
                <span
                  className="publisher-discovery-status"
                  data-status={
                    work.completion
                  }
                >
                  {work.completion ===
                  "completed"
                    ? "Tamamlandı"
                    : "Devam ediyor"}
                </span>
                <small>
                  {work.chapterCount} yayımlanmış
                  bölüm
                </small>
              </td>

              <td data-label="Editör">
                <span>
                  {
                    reviewLabels[
                      work.editorReviewStatus
                    ]
                  }
                </span>
              </td>

              <td data-label="Metrikler">
                <div className="publisher-discovery-table__metrics">
                  <span>
                    {formatNumber(
                      work.readerCount,
                    )}{" "}
                    okur
                  </span>
                  <span>
                    {formatNumber(
                      work.favoriteCount,
                    )}{" "}
                    favori
                  </span>
                  <span>
                    {formatNumber(
                      work.commentCount,
                    )}{" "}
                    yorum
                  </span>
                </div>
              </td>

              <td data-label="Pasaport">
                <span
                  className="publisher-discovery-status"
                  data-status={
                    work.hasPassportRecord
                      ? "available"
                      : "pending"
                  }
                >
                  {work.hasPassportRecord
                    ? "Kayıtlı"
                    : "Kanıt bekliyor"}
                </span>
                <small>
                  {work.versionCount} sürüm
                </small>
              </td>

              <td data-label="İşlemler">
                <div className="publisher-discovery-table__actions">
                  {canLike ? (
                    <form
                      action={togglePublisherWorkLikeAction}
                      className="publisher-discovery-engagement-form"
                    >
                      <input
                        name="workId"
                        type="hidden"
                        value={work.id}
                      />
                      <input
                        name="active"
                        type="hidden"
                        value={
                          liked.has(work.id)
                            ? "false"
                            : "true"
                        }
                      />
                      <input
                        name="returnPath"
                        type="hidden"
                        value={returnTo}
                      />
                      <button
                        className={
                          liked.has(work.id)
                            ? "button button--primary"
                            : "button button--outline"
                        }
                        type="submit"
                      >
                        {liked.has(work.id)
                          ? "Beğenmekten vazgeç"
                          : "Eseri beğen"}
                      </button>
                    </form>
                  ) : (
                    <span className="publisher-discovery-table__permission">
                      Beğeni yetkisi gerekli
                    </span>
                  )}

                  <Link
                    className="button button--outline"
                    href={`/kitap/${work.slug}?from=${encodeURIComponent(returnTo)}`}
                  >
                    Eser sayfası
                  </Link>

                  {canViewPassport ? (
                    <Link
                      className="button button--primary"
                      href={`/yayinevi/kesfet/eserler/${work.id}/pasaport`}
                    >
                      Eser Pasaportu
                    </Link>
                  ) : (
                    <span className="publisher-discovery-table__permission">
                      Pasaport yetkisi gerekli
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
