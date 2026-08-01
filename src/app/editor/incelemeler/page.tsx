import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { SecondEditorAssignmentDialog } from "@/features/editor-workspace/components/SecondEditorAssignmentDialog";
import { countWords } from "@/features/editor-workspace/eligibility";
import {
  getAvailableSecondEditors,
  getEditorReviews,
  type EditorReviewListStatus,
} from "@/features/editor-workspace/queries";

export const metadata: Metadata = {
  title: "İncelemelerim | İlkOku",
};
export const dynamic = "force-dynamic";

type EditorReviewsPageProps = {
  searchParams: Promise<{ durum?: string }>;
};

function formatDate(value: Date | null) {
  if (!value) return "Tarih kaydı yok";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

function getStatusLabel(status: string) {
  if (status === "awaiting_second_editor") return "2. editör bekleniyor";
  if (status === "second_in_progress") return "2. editör inceliyor";
  return "İnceleme devam ediyor";
}

export default async function EditorReviewsPage({
  searchParams,
}: EditorReviewsPageProps) {
  const { durum } = await searchParams;
  const view: EditorReviewListStatus =
    durum === "tamamlanan" ? "completed" : "active";
  const isCompleted = view === "completed";

  const profile = await requireEditorProfile(
    isCompleted
      ? "/editor/incelemeler?durum=tamamlanan"
      : "/editor/incelemeler",
  );
  const [works, availableSecondEditors] = await Promise.all([
    getEditorReviews(profile.id, view),
    isCompleted
      ? Promise.resolve([])
      : getAvailableSecondEditors(profile.id),
  ]);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description={
            isCompleted
              ? "Sonuçlandırdığınız profesyonel incelemeleri ve teslim edilen raporları görüntüleyin."
              : "Üzerinize aldığınız ve incelemesi devam eden eserleri yönetin."
          }
          title={isCompleted ? "Tamamlanan İncelemeler" : "İncelemeye Aldıklarım"}
        />

        <nav aria-label="İnceleme görünümü" className="editor-review-tabs">
          <Link
            aria-current={!isCompleted ? "page" : undefined}
            className={!isCompleted ? "is-active" : undefined}
            href="/editor/incelemeler"
          >
            Devam Edenler
          </Link>
          <Link
            aria-current={isCompleted ? "page" : undefined}
            className={isCompleted ? "is-active" : undefined}
            href="/editor/incelemeler?durum=tamamlanan"
          >
            Tamamlananlar
          </Link>
        </nav>

        <div className="editor-review-list">
          {works.map((work) => {
            const report = work.editorFeedback[0] ?? null;
            const currentAssignment =
              work.editorReviewAssignments[0] ?? null;
            const authorName =
              work.author.displayName ?? work.author.fullName;
            const totalWords = work.chapters.reduce(
              (total, chapter) => total + countWords(chapter.content),
              0,
            );

            const isFirstEditor =
              work.assignedEditorId === profile.id;

            const isSecondEditor =
              currentAssignment?.stage === "second";

            const canContinueReview =
              (isFirstEditor &&
                work.editorReviewStatus === "in_progress") ||
              (isSecondEditor &&
                work.editorReviewStatus === "second_in_progress");

            const canAssignSecondEditor =
              isFirstEditor &&
              work.editorReviewStatus === "awaiting_second_editor";

            return (
              <article
                className={`editor-review-row ${
                  isCompleted ? "editor-review-row--completed" : ""
                }`}
                key={work.id}
              >
                <div>
                  <span>
                    {isCompleted
                      ? `Tamamlandı · ${formatDate(work.editorReviewCompletedAt)}`
                      : getStatusLabel(work.editorReviewStatus)}
                  </span>
                  <h2>{work.title}</h2>
                  <p>
                    {authorName} · {totalWords.toLocaleString("tr-TR")} kelime
                  </p>
                </div>

                {isCompleted ? (
                  <div className="editor-review-row__report">
                    <strong>{report?.title ?? "Profesyonel inceleme raporu"}</strong>
                    <p>
                      {report?.content ??
                        "Tamamlanan incelemeye ait rapor kaydı görüntülenmeye hazır."}
                    </p>
                  </div>
                ) : (
                  <div className="editor-review-row__progress">
                    <strong>
                      {work.chapters.length.toLocaleString("tr-TR")} yayımlanmış bölüm
                    </strong>
                    <p>Notlarınızı tamamlayıp inceleme raporunu teslim edin.</p>
                  </div>
                )}

                {isCompleted ? (
                  <Link
                    className="button button--outline"
                    href={`/editor/incelemeler/${work.id}`}
                  >
                    Raporu Görüntüle
                  </Link>
                ) : canAssignSecondEditor ? (
                  <SecondEditorAssignmentDialog
                    editors={availableSecondEditors}
                    workAuthorId={work.authorId}
                    workId={work.id}
                    workTitle={work.title}
                  />
                ) : canContinueReview && work.chapters[0] ? (
                  <Link
                    className="button button--outline"
                    href={`/oku/${work.slug}/bolum-${work.chapters[0].position}`}
                  >
                    İncelemeye Devam Et
                  </Link>
                ) : (
                  <Link
                    className="button button--outline"
                    href={`/kitap/${work.slug}`}
                  >
                    Eseri Görüntüle
                  </Link>
                )}
              </article>
            );
          })}
        </div>

        {works.length === 0 && (
          <div className="editor-empty">
            <h2>
              {isCompleted
                ? "Tamamlanan inceleme bulunmuyor"
                : "Devam eden inceleme bulunmuyor"}
            </h2>
            <p>
              {isCompleted
                ? "Teslim ettiğiniz profesyonel incelemeler burada listelenecek."
                : "Genel Editör Havuzu'ndan uygun bir eseri incelemeye alabilirsiniz."}
            </p>
            {!isCompleted && (
              <Link className="button button--outline" href="/editor/kesfet">
                Genel Editör Havuzuna Git
              </Link>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
