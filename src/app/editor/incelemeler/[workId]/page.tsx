import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { countWords } from "@/features/editor-workspace/eligibility";
import { getEditorReviewDetail } from "@/features/editor-workspace/queries";

export const metadata: Metadata = {
  title: "İnceleme Raporu | İlkOku",
};
export const dynamic = "force-dynamic";

type EditorReviewDetailPageProps = {
  params: Promise<{ workId: string }>;
};

function formatDate(value: Date | null) {
  if (!value) return "Tarih kaydı yok";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

export default async function EditorReviewDetailPage({
  params,
}: EditorReviewDetailPageProps) {
  const { workId } = await params;
  const profile = await requireEditorProfile(`/editor/incelemeler/${workId}`);
  const work = await getEditorReviewDetail(profile.id, workId);

  if (!work) notFound();

  const report = work.editorFeedback[0] ?? null;
  const authorName = work.author.displayName ?? work.author.fullName;
  const totalWords = work.chapters.reduce(
    (total, chapter) => total + countWords(chapter.content),
    0,
  );

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description={`${authorName} · ${totalWords.toLocaleString("tr-TR")} kelime · ${formatDate(work.editorReviewCompletedAt)}`}
          title={work.title}
        />

        <article className="editor-review-report">
          <header>
            <span>Tamamlanan profesyonel inceleme</span>
            <h2>{report?.title ?? "İnceleme raporu"}</h2>
            {report && (
              <p>
                {report.category} · {report.priority === "important" ? "Önemli" : "Normal"}
              </p>
            )}
          </header>

          <div className="editor-review-report__content">
            {report?.content ? (
              report.content
                .split(/\n{2,}/)
                .map((paragraph) => <p key={paragraph}>{paragraph}</p>)
            ) : (
              <p>Bu incelemeye ait tamamlanmış rapor kaydı bulunamadı.</p>
            )}
          </div>

          <footer>
            <Link
              className="button button--outline"
              href={`/editor/incelemeler/${work.id}/pasaport`}
            >
              Eser Pasaportu
            </Link>
            <Link
              className="button button--outline"
              href="/editor/incelemeler?durum=tamamlanan"
            >
              Tamamlananlara Dön
            </Link>
            <Link className="button button--outline" href={`/kitap/${work.slug}`}>
              Eseri Görüntüle
            </Link>
          </footer>
        </article>
      </div>
    </AppShell>
  );
}
