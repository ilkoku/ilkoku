import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { getEditorReviews } from "@/features/editor-workspace/queries";

export const metadata: Metadata = {
  title: "Editör Seçkilerim | İlkOku",
};
export const dynamic = "force-dynamic";

export default async function EditorSelectionsPage() {
  const profile = await requireEditorProfile("/editor/seckiler");
  const works = (await getEditorReviews(profile.id)).filter(
    (work) => work.editorReviewStatus === "completed",
  );

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Profesyonel incelemesini tamamladığınız eserlerden oluşan kişisel seçkiniz."
          title="Editör Seçkilerim"
        />
        <div className="editor-selection-grid">
          {works.map((work) => (
            <article key={work.id}>
              <span>İncelendi</span>
              <h2>{work.title}</h2>
              <p>{work.author.displayName ?? work.author.fullName}</p>
              <Link className="button button--outline" href={`/kitap/${work.slug}`}>
                Eseri Gör
              </Link>
            </article>
          ))}
        </div>
        {works.length === 0 && (
          <div className="editor-empty">
            <h2>Seçkiniz henüz boş</h2>
            <p>Tamamladığınız profesyonel incelemeler burada görünür.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
