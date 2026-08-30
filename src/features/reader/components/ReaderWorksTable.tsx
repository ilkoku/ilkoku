"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { toggleFavoriteAction } from "@/features/reader/favorites";
import { restartReadingAction } from "@/features/reading/progress";
import {
  workContentRatingDetails,
  type StoredWorkContentRating,
} from "@/lib/work-content-classification";
import "./reader-works-table.css";
import "./reader-discovery-table.css";

export type ReaderWorkRow = {
  authorName: string;
  authorUsername?: string | null;
  chapterCount: number;
  commentCount: number;
  completedAt?: string | null;
  contentRating: StoredWorkContentRating;
  coverUrl: string | null;
  description?: string | null;
  editorReviewStatus:
    | "not_requested"
    | "requested"
    | "in_progress"
    | "awaiting_second_editor"
    | "second_in_progress"
    | "completed";
  favoriteCount: number;
  genre: string | null;
  id: string;
  isFavorite?: boolean;
  language?: string | null;
  lastReadLabel?: string | null;
  progressPercent?: number | null;
  publishedAt?: string | null;
  readerCount: number;
  readingHref?: string | null;
  readingState?: "unread" | "in_progress" | "completed";
  slug: string;
  title: string;
  totalWords?: number;
  updatedAt?: string | null;
};

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
  }).format(new Date(value));
}

function languageLabel(value: string) {
  if (value === "tr") return "Türkçe";
  if (value === "en") return "İngilizce";
  if (value === "de") return "Almanca";
  if (value === "fr") return "Fransızca";

  return value.toLocaleUpperCase("tr-TR");
}

function usernameLabel(value: string) {
  return value.startsWith("@") ? value : `@${value}`;
}

function reviewLabel(status: ReaderWorkRow["editorReviewStatus"]) {
  switch (status) {
    case "completed":
      return "Editör incelemesi tamamlandı";
    case "in_progress":
    case "second_in_progress":
      return "Editör incelemesinde";
    case "awaiting_second_editor":
      return "İkinci editör bekleniyor";
    case "requested":
      return "İnceleme talep edildi";
    default:
      return "Henüz incelenmedi";
  }
}

function shortReviewLabel(status: ReaderWorkRow["editorReviewStatus"]) {
  switch (status) {
    case "completed":
      return "İncelendi";
    case "in_progress":
    case "second_in_progress":
      return "İncelemede";
    case "awaiting_second_editor":
      return "2. editör bekliyor";
    case "requested":
      return "Talep edildi";
    default:
      return "İncelenmedi";
  }
}

function appendReturnPath(href: string, returnTo: string) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}from=${encodeURIComponent(returnTo)}`;
}

function passportHref(slug: string, returnTo: string) {
  return appendReturnPath(`/kitap/${slug}/pasaport`, returnTo);
}

function FavoriteToggle({
  iconOnly = false,
  returnTo,
  work,
}: {
  iconOnly?: boolean;
  returnTo: string;
  work: ReaderWorkRow;
}) {
  const label = work.isFavorite ? "Favoriden Çıkar" : "Favoriye Ekle";

  return (
    <form action={toggleFavoriteAction}>
      <input name="workId" type="hidden" value={work.id} />
      <input name="returnPath" type="hidden" value={returnTo} />
      <button
        aria-label={iconOnly ? label : undefined}
        className={
          iconOnly
            ? "workspace-row-action workspace-row-action--icon"
            : "button button--outline"
        }
        type="submit"
      >
        {iconOnly ? (work.isFavorite ? "♥" : "♡") : label}
      </button>
    </form>
  );
}

export function ReaderWorksTable({
  emptyDescription,
  emptyTitle,
  returnTo = "/favorilerim",
  rows,
}: {
  emptyDescription: string;
  emptyTitle: string;
  returnTo?: string;
  rows: ReaderWorkRow[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedWork = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  );

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedId(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  if (rows.length === 0) {
    return (
      <div className="workspace-list-empty">
        <h2>{emptyTitle}</h2>
        <p>{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div
      className="workspace-split-view"
      data-detail-open={selectedWork ? "true" : undefined}
    >
      <div className="workspace-table-shell">
        <div className="workspace-table-scroll">
          <table className="workspace-table workspace-table--discovery">
            <thead>
              <tr>
                <th>Eser</th>
                <th>Tür / Yaş</th>
                <th>İlerleme</th>
                <th>Bilgi</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((work) => {
                const isSelected = selectedId === work.id;

                return (
                  <tr data-selected={isSelected ? "true" : undefined} key={work.id}>
                    <td data-label="Eser">
                      <div className="workspace-work-cell">
                        <button
                          aria-label={`${work.title} detaylarını göster`}
                          className="workspace-cover-button"
                          onClick={() => setSelectedId(work.id)}
                          type="button"
                        >
                          {work.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt="" src={work.coverUrl} />
                          ) : (
                            <span aria-hidden="true">İO</span>
                          )}
                        </button>
                        <div className="workspace-work-cell__body">
                          <button
                            className="workspace-title-button"
                            onClick={() => setSelectedId(work.id)}
                            type="button"
                          >
                            {work.title}
                          </button>
                          <div className="workspace-work-cell__meta">
                            <span>{work.authorName}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatNumber(work.chapterCount)} bölüm</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Tür / Yaş">
                      <div className="workspace-taxonomy-cell">
                        <strong>{work.genre ?? "Belirtilmedi"}</strong>
                        <span>{workContentRatingDetails[work.contentRating].shortLabel}</span>
                      </div>
                    </td>
                    <td data-label="İlerleme">
                      {typeof work.progressPercent === "number" ? (
                        <div className="workspace-progress-cell">
                          <span>{work.progressPercent}%</span>
                          <i aria-hidden="true">
                            <b style={{ width: `${work.progressPercent}%` }} />
                          </i>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label="Bilgi">
                      <div
                        aria-label={`Okur ${formatNumber(work.readerCount)}, beğeni ${formatNumber(work.favoriteCount)}, yorum ${formatNumber(work.commentCount)}, editör ${shortReviewLabel(work.editorReviewStatus)}`}
                        className="workspace-row-insights"
                        tabIndex={0}
                      >
                        <span aria-hidden="true" className="workspace-row-insights__trigger">
                          i
                        </span>
                        <div className="workspace-row-insights__bubble" role="tooltip">
                          <strong>Hızlı bilgi</strong>
                          <dl>
                            <div>
                              <dt>Okur</dt>
                              <dd>{formatNumber(work.readerCount)}</dd>
                            </div>
                            <div>
                              <dt>Beğeni</dt>
                              <dd>{formatNumber(work.favoriteCount)}</dd>
                            </div>
                            <div>
                              <dt>Yorum</dt>
                              <dd>{formatNumber(work.commentCount)}</dd>
                            </div>
                            <div>
                              <dt>Editör</dt>
                              <dd>{shortReviewLabel(work.editorReviewStatus)}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    </td>
                    <td data-label="İşlem">
                      <div className="workspace-row-actions workspace-row-actions--discovery">
                        <button
                          aria-expanded={isSelected}
                          className="workspace-row-action"
                          onClick={() => setSelectedId(work.id)}
                          type="button"
                        >
                          Detay
                        </button>
                        <FavoriteToggle iconOnly returnTo={returnTo} work={work} />
                        {work.readingState === "completed" ? (
                          <form action={restartReadingAction}>
                            <input name="workId" type="hidden" value={work.id} />
                            <input name="returnTo" type="hidden" value={returnTo} />
                            <button
                              className="workspace-row-action workspace-row-action--primary"
                              type="submit"
                            >
                              Yeniden Oku
                            </button>
                          </form>
                        ) : (
                          <Link
                            className="workspace-row-action workspace-row-action--primary"
                            href={appendReturnPath(
                              work.readingHref ?? `/kitap/${work.slug}`,
                              returnTo,
                            )}
                          >
                            {work.readingHref
                              ? typeof work.progressPercent === "number"
                                ? "Devam Et"
                                : "Oku"
                              : "Aç"}
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedWork && (
        <aside
          aria-label={`${selectedWork.title} eser detayları`}
          className="workspace-detail-panel"
        >
          <header className="workspace-detail-panel__header">
            <div>
              <p>Eser detayı</p>
              <h2>{selectedWork.title}</h2>
            </div>
            <button
              aria-label="Detay panelini kapat"
              className="workspace-detail-panel__close"
              onClick={() => setSelectedId(null)}
              type="button"
            >
              ×
            </button>
          </header>

          <div className="workspace-detail-panel__body">
            <p className="workspace-detail-panel__description">
              {selectedWork.description?.trim() ||
                "Yazar bu eser için henüz bir tanıtım metni eklemedi."}
            </p>

            <dl>
              <div>
                <dt>Yazar</dt>
                <dd>{selectedWork.authorName}</dd>
              </div>

              {selectedWork.authorUsername && (
                <div>
                  <dt>Yazar profili</dt>
                  <dd>{usernameLabel(selectedWork.authorUsername)}</dd>
                </div>
              )}

              <div>
                <dt>Tür</dt>
                <dd>{selectedWork.genre ?? "Belirtilmedi"}</dd>
              </div>

              <div>
                <dt>Hitap yaşı</dt>
                <dd>{workContentRatingDetails[selectedWork.contentRating].label}</dd>
              </div>

              {selectedWork.language && (
                <div>
                  <dt>Dil</dt>
                  <dd>{languageLabel(selectedWork.language)}</dd>
                </div>
              )}

              <div>
                <dt>Bölüm</dt>
                <dd>{formatNumber(selectedWork.chapterCount)}</dd>
              </div>

              {typeof selectedWork.totalWords === "number" && (
                <div>
                  <dt>Toplam kelime</dt>
                  <dd>{formatNumber(selectedWork.totalWords)}</dd>
                </div>
              )}

              <div>
                <dt>Okur</dt>
                <dd>{formatNumber(selectedWork.readerCount)}</dd>
              </div>

              <div>
                <dt>Beğeni</dt>
                <dd>{formatNumber(selectedWork.favoriteCount)}</dd>
              </div>

              <div>
                <dt>Yorum</dt>
                <dd>{formatNumber(selectedWork.commentCount)}</dd>
              </div>

              <div>
                <dt>Editör durumu</dt>
                <dd>{reviewLabel(selectedWork.editorReviewStatus)}</dd>
              </div>

              {selectedWork.publishedAt && (
                <div>
                  <dt>Yayımlanma</dt>
                  <dd>{formatDate(selectedWork.publishedAt)}</dd>
                </div>
              )}

              {selectedWork.updatedAt && (
                <div>
                  <dt>Son güncelleme</dt>
                  <dd>{formatDate(selectedWork.updatedAt)}</dd>
                </div>
              )}

              {selectedWork.completedAt && (
                <div>
                  <dt>Okuma tamamlandı</dt>
                  <dd>{formatDate(selectedWork.completedAt)}</dd>
                </div>
              )}

              {selectedWork.lastReadLabel && (
                <div>
                  <dt>Son okunan bölüm</dt>
                  <dd>{selectedWork.lastReadLabel}</dd>
                </div>
              )}

              {typeof selectedWork.isFavorite === "boolean" && (
                <div>
                  <dt>Favori durumu</dt>
                  <dd>
                    {selectedWork.isFavorite
                      ? "Favorilerimde"
                      : "Favorilerimde değil"}
                  </dd>
                </div>
              )}
            </dl>

            {typeof selectedWork.progressPercent === "number" && (
              <div className="workspace-detail-progress">
                <span>Okuma ilerlemesi</span>
                <strong>{selectedWork.progressPercent}%</strong>
                <i aria-hidden="true">
                  <b style={{ width: `${selectedWork.progressPercent}%` }} />
                </i>
              </div>
            )}
          </div>

          <footer className="workspace-detail-panel__footer">
            <Link
              className="button button--outline"
              href={appendReturnPath(`/kitap/${selectedWork.slug}`, returnTo)}
            >
              Eser Sayfası
            </Link>
            <Link
              className="button button--outline"
              href={passportHref(selectedWork.slug, returnTo)}
            >
              Eser Pasaportu
            </Link>
            <FavoriteToggle returnTo={returnTo} work={selectedWork} />
            {selectedWork.readingState === "completed" ? (
              <form action={restartReadingAction}>
                <input name="workId" type="hidden" value={selectedWork.id} />
                <input name="returnTo" type="hidden" value={returnTo} />
                <button className="button button--primary" type="submit">
                  Yeniden Oku
                </button>
              </form>
            ) : (
              <Link
                className="button button--primary"
                href={appendReturnPath(
                  selectedWork.readingHref ?? `/kitap/${selectedWork.slug}`,
                  returnTo,
                )}
              >
                {selectedWork.readingHref
                  ? typeof selectedWork.progressPercent === "number"
                    ? "Okumaya Devam Et"
                    : "Okumaya Başla"
                  : "Eseri Aç"}
              </Link>
            )}
          </footer>
        </aside>
      )}
    </div>
  );
}
