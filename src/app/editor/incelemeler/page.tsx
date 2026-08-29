import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { SecondEditorAssignmentDialog } from "@/features/editor-workspace/components/SecondEditorAssignmentDialog";
import { countWords } from "@/features/editor-workspace/eligibility";
import {
  getAvailableSecondEditors,
  type EditorReviewListStatus,
} from "@/features/editor-workspace/queries";
import {
  getEditorReviewsByStage,
  type EditorReviewStage,
} from "@/features/editor-workspace/stage-queries";

export const metadata: Metadata = {
  title: "İncelemelerim | İlkOku",
};
export const dynamic = "force-dynamic";

type EditorReviewsPageProps = {
  searchParams: Promise<{
    asama?: string;
    durum?: string;
  }>;
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

function pageState(input: {
  stage: EditorReviewStage;
  status: EditorReviewListStatus;
}) {
  if (input.status === "completed") {
    return {
      description:
        "Birinci veya ikinci editör olarak sonuçlandırdığınız profesyonel incelemeleri ve teslim edilen raporları görüntüleyin.",
      emptyDescription:
        "Teslim ettiğiniz profesyonel incelemeler burada listelenecek.",
      emptyTitle: "Tamamlanan inceleme bulunmuyor",
      title: "Tamamlanan İncelemeler",
    };
  }

  if (input.stage === "second") {
    return {
      description:
        "Belirli olarak atandığınız veya genel havuzdan aldığınız bağımsız ikinci editör görevlerini yönetin.",
      emptyDescription:
        "Genel Editör Havuzu'ndaki ikinci editör görevlerinden birini alabilir veya size yapılan atamayı bekleyebilirsiniz.",
      emptyTitle: "Aktif ikinci editör görevi bulunmuyor",
      title: "2. Editör İncelemelerim",
    };
  }

  return {
    description:
      "Genel Editör Havuzu'ndan aldığınız birinci editör görevlerini, rapor teslimini ve ikinci editöre gönderim sürecini yönetin.",
    emptyDescription:
      "Genel Editör Havuzu'ndan uygun bir birinci editör görevini incelemeye alabilirsiniz.",
    emptyTitle: "Aktif birinci editör görevi bulunmuyor",
    title: "1. Editör İncelemelerim",
  };
}

export default async function EditorReviewsPage({
  searchParams,
}: EditorReviewsPageProps) {
  const parameters = await searchParams;
  const status: EditorReviewListStatus =
    parameters.durum === "tamamlanan"
      ? "completed"
      : "active";
  const stage: EditorReviewStage =
    status === "completed"
      ? "all"
      : parameters.asama === "ikinci"
        ? "second"
        : "first";
  const isCompleted = status === "completed";
  const state = pageState({ stage, status });
  const currentPath = isCompleted
    ? "/editor/incelemeler?durum=tamamlanan"
    : stage === "second"
      ? "/editor/incelemeler?asama=ikinci"
      : "/editor/incelemeler?asama=birinci";

  const profile = await requireEditorProfile(currentPath);
  const [works, availableSecondEditors] = await Promise.all([
    getEditorReviewsByStage(profile.id, status, stage),
    !isCompleted && stage === "first"
      ? getAvailableSecondEditors(profile.id)
      : Promise.resolve([]),
  ]);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description={state.description}
          title={state.title}
        />

        <nav aria-label="İnceleme görünümü" className="editor-review-tabs">
          <Link
            aria-current={!isCompleted && stage === "first" ? "page" : undefined}
            className={!isCompleted && stage === "first" ? "is-active" : undefined}
            href="/editor/incelemeler?asama=birinci"
          >
            1. Editör
          </Link>
          <Link
            aria-current={!isCompleted && stage === "second" ? "page" : undefined}
            className={!isCompleted && stage === "second" ? "is-active" : undefined}
            href="/editor/incelemeler?asama=ikinci"
          >
            2. Editör
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
                    <p>
                      {stage === "second"
                        ? "Bağımsız ikinci editör raporunuzu tamamlayıp teslim edin."
                        : "Birinci editör raporunuzu tamamlayıp ikinci editör aşamasını başlatın."}
                    </p>
                  </div>
                )}

                <div className="editor-table-actions">
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

                  <Link
                    className="button button--outline"
                    href={`/editor/eserler/${work.id}/pasaport`}
                  >
                    Eser Pasaportu
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {works.length === 0 && (
          <div className="editor-empty">
            <h2>{state.emptyTitle}</h2>
            <p>{state.emptyDescription}</p>
            {!isCompleted && (
              <Link className="button button--outline" href="/editor/talepler">
                Genel Editör Havuzuna Git
              </Link>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
