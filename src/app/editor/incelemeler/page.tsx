import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { countWords } from "@/features/editor-workspace/eligibility";
import { getEditorReviews } from "@/features/editor-workspace/queries";

export const metadata: Metadata = {
  title: "İncelemelerim | İlkOku",
};
export const dynamic = "force-dynamic";

export default async function EditorReviewsPage() {
  const profile = await requireEditorProfile("/editor/incelemeler");
  const works = await getEditorReviews(profile.id);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Devam eden ve tamamlanan profesyonel incelemelerinizi yönetin."
          title="İncelemelerim"
        />
        <div className="editor-review-list">
          {works.map((work) => {
            const report = work.editorFeedback[0] ?? null;
            const authorName = work.author.displayName ?? work.author.fullName;
            const totalWords = work.chapters.reduce(
              (total, chapter) => total + countWords(chapter.content),
              0,
            );

            return (
              <article className="editor-review-row" key={work.id}>
                <div>
                  <span>{work.editorReviewStatus === "completed" ? "Tamamlandı" : "Devam ediyor"}</span>
                  <h2>{work.title}</h2>
                  <p>{authorName} · {totalWords.toLocaleString("tr-TR")} kelime</p>
                </div>
                {report && (
                  <div className="editor-review-row__report">
                    <strong>{report.title}</strong>
                    <p>{report.content}</p>
                  </div>
                )}
                <Link
                  className="button button--outline"
                  href={`/oku/${work.slug}/bolum-1`}
                >
                  {work.editorReviewStatus === "completed" ? "Eseri Gör" : "İncelemeye Devam Et"}
                </Link>
              </article>
            );
          })}
        </div>
        {works.length === 0 && (
          <div className="editor-empty">
            <h2>Aktif inceleme yok</h2>
            <p>Keşfet alanından uygun bir eseri incelemeye alabilirsiniz.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
