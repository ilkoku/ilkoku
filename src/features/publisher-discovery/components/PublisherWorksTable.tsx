import Link from "next/link";

import { DiscoveryRoleWorksTable } from "@/components/discovery/DiscoveryRoleWorksTable";
import { PublisherEditorRequestForm } from "@/features/publisher-editor-requests/components/PublisherEditorRequestForm";
import { workContentRatingDetails } from "@/lib/work-content-classification";
import { togglePublisherWorkLikeAction } from "../engagement-actions";
import { togglePublisherWorkFavoriteAction } from "../engagement-extended-actions";
import type { PublisherWorkDiscoveryRow } from "../work-query";
import type { PublisherShareRecipientOption } from "../sharing-repository";
import { PublisherDiscoveryShareForm } from "./PublisherDiscoveryShareForm";

const reviewLabels = {
  awaiting_second_editor: "İkinci editör bekleniyor",
  completed: "Editör incelemesi tamamlandı",
  in_progress: "İlk editörde",
  not_requested: "Henüz incelenmedi",
  requested: "İnceleme talep edildi",
  second_in_progress: "İkinci editörde",
} as const;

function languageLabel(value: string) {
  if (value === "tr") return "Türkçe";
  if (value === "en") return "İngilizce";
  if (value === "de") return "Almanca";
  if (value === "fr") return "Fransızca";
  return value.toLocaleUpperCase("tr-TR");
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function PublisherWorksTable({
  activeEditorRequestWorkIds,
  canFavorite,
  canLike,
  canRequestEditorReview,
  canShareEmail,
  canShareInternal,
  canViewPassport,
  favoriteWorkIds,
  likedWorkIds,
  returnTo,
  rows,
  shareMembers,
}: {
  activeEditorRequestWorkIds: string[];
  canFavorite: boolean;
  canLike: boolean;
  canRequestEditorReview: boolean;
  canShareEmail: boolean;
  canShareInternal: boolean;
  canViewPassport: boolean;
  favoriteWorkIds: string[];
  likedWorkIds: string[];
  returnTo: string;
  rows: PublisherWorkDiscoveryRow[];
  shareMembers: PublisherShareRecipientOption[];
}) {
  const liked = new Set(likedWorkIds);
  const favorited = new Set(favoriteWorkIds);
  const activeEditorRequests = new Set(activeEditorRequestWorkIds);

  return (
    <DiscoveryRoleWorksTable
      rows={rows.map((work) => ({
        actions: (
          <>
            {canLike ? (
              <form action={togglePublisherWorkLikeAction}>
                <input name="workId" type="hidden" value={work.id} />
                <input
                  name="active"
                  type="hidden"
                  value={liked.has(work.id) ? "false" : "true"}
                />
                <input name="returnPath" type="hidden" value={returnTo} />
                <button
                  className={
                    liked.has(work.id)
                      ? "button button--primary"
                      : "button button--outline"
                  }
                  type="submit"
                >
                  {liked.has(work.id) ? "Beğenildi" : "Beğen"}
                </button>
              </form>
            ) : null}

            {canFavorite ? (
              <form action={togglePublisherWorkFavoriteAction}>
                <input name="workId" type="hidden" value={work.id} />
                <input
                  name="active"
                  type="hidden"
                  value={favorited.has(work.id) ? "false" : "true"}
                />
                <input name="returnPath" type="hidden" value={returnTo} />
                <button
                  className={
                    favorited.has(work.id)
                      ? "button button--primary"
                      : "button button--outline"
                  }
                  type="submit"
                >
                  {favorited.has(work.id) ? "Favoride" : "Favorile"}
                </button>
              </form>
            ) : null}

            <Link
              className="button button--outline"
              href={`/kitap/${work.slug}?from=${encodeURIComponent(returnTo)}`}
            >
              Eseri Aç
            </Link>

            {canViewPassport ? (
              <Link
                className="button button--primary"
                href={`/yayinevi/kesfet/eserler/${work.id}/pasaport`}
              >
                Pasaport
              </Link>
            ) : null}

            {canRequestEditorReview ? (
              <PublisherEditorRequestForm
                active={activeEditorRequests.has(work.id)}
                eligible={work.completion === "completed"}
                workId={work.id}
              />
            ) : null}

            <PublisherDiscoveryShareForm
              canShareEmail={canShareEmail}
              canShareInternal={canShareInternal}
              entityId={work.id}
              entityKind="work"
              members={shareMembers}
              returnPath={returnTo}
            />

            {!canLike &&
            !canFavorite &&
            !canRequestEditorReview &&
            !canShareEmail &&
            !canShareInternal ? (
              <span className="publisher-discovery-table__permission">
                Etkileşim yetkisi gerekli
              </span>
            ) : null}
          </>
        ),
        authorAlias: work.authorAlias,
        authorName: work.authorName,
        chapterCount: work.chapterCount,
        commentCount: work.commentCount,
        contentRatingLabel: workContentRatingDetails[work.contentRating].shortLabel,
        favoriteCount: work.favoriteCount,
        genre: work.genre,
        href: `/kitap/${work.slug}?from=${encodeURIComponent(returnTo)}`,
        id: work.id,
        meta: `${languageLabel(work.language)} · ${dateLabel(work.publishedAt)}`,
        readerCount: work.readerCount,
        statusLabel: reviewLabels[work.editorReviewStatus],
        statusMeta: `${work.completion === "completed" ? "Tamamlandı" : "Devam ediyor"} · ${work.hasPassportRecord ? "Pasaport kayıtlı" : "Pasaport bekliyor"}`,
        title: work.title,
      }))}
    />
  );
}
