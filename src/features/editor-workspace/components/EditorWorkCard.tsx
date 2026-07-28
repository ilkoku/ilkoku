import Link from "next/link";
import { toggleFavoriteAction } from "@/features/reader/favorites";
import { toggleEditorFavoriteAction } from "../actions";
import type { EditorWorkCardData } from "../types";
import { RecommendationForm } from "./RecommendationForm";
import { ReviewClaimDialog } from "./ReviewClaimDialog";

function reviewLabel(status: EditorWorkCardData["editorReviewStatus"]) {
  if (status === "completed") return "İncelendi";
  if (status === "second_in_progress") return "İkinci editörde";
  if (status === "awaiting_second_editor") return "İkinci editör bekliyor";
  if (status === "in_progress") return "İncelemede";
  if (status === "requested") return "Yazar görüşe açık";
  return "İnceleme beklemiyor";
}

export function EditorWorkCard({
  allowClaim = true,
  context = "editor",
  work,
}: {
  allowClaim?: boolean;
  context?: "editor" | "reader";
  work: EditorWorkCardData;
}) {
  const isReaderContext = context === "reader";
  const canClaim =
    !isReaderContext &&
    allowClaim &&
    !work.assignedEditorId &&
    (work.editorReviewStatus === "not_requested" ||
      work.editorReviewStatus === "requested");

  return (
    <article className="editor-work-card">
      <div className="editor-work-card__cover">
        <span>✦</span>
        <strong>{work.title}</strong>
        <small>İlkOku</small>
      </div>

      <div className="editor-work-card__body">
        <div className="editor-work-card__badges">
          <span>{work.genre ?? "Tür belirtilmedi"}</span>
          <span>
            {reviewLabel(work.editorReviewStatus)}
          </span>
        </div>
        <h2>{work.title}</h2>
        <p>{work.authorName}</p>
        <dl>
          <div>
            <dt>Bölüm</dt>
            <dd>{work.chapterCount}</dd>
          </div>
          <div>
            <dt>Kelime</dt>
            <dd>{work.totalWords.toLocaleString("tr-TR")}</dd>
          </div>
          <div>
            <dt>Dil</dt>
            <dd>{work.language.toLocaleUpperCase("tr")}</dd>
          </div>
        </dl>

        <div className="editor-work-card__actions">
          <Link className="button button--outline" href={`/kitap/${work.slug}`}>
            {isReaderContext ? "Eseri Aç" : "Eseri İncele"}
          </Link>
          <form
            action={
              isReaderContext
                ? toggleFavoriteAction
                : toggleEditorFavoriteAction
            }
          >
            <input name="workId" type="hidden" value={work.id} />
            <button className="button button--ghost" type="submit">
              {work.isFavorite ? "Favoriden Çıkar" : "Favoriye Ekle"}
            </button>
          </form>
        </div>

        {canClaim && (
          <ReviewClaimDialog workId={work.id} workTitle={work.title} />
        )}

        {!isReaderContext && (
          <details className="editor-recommend">
            <summary>Başka editöre öner</summary>
            <RecommendationForm workId={work.id} />
          </details>
        )}
      </div>
    </article>
  );
}
