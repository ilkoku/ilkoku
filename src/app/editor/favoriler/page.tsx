import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { EditorWorkCard } from "@/features/editor-workspace/components/EditorWorkCard";
import { getEditorFavorites } from "@/features/editor-workspace/queries";

export const metadata: Metadata = {
  title: "Favorilerim | İlkOku",
};
export const dynamic = "force-dynamic";

export default async function EditorFavoritesPage() {
  const profile = await requireEditorProfile("/editor/favoriler");
  const works = await getEditorFavorites(profile.id);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Daha sonra yeniden değerlendirmek istediğiniz eserler."
          title="Favorilerim"
        />
        {works.length ? (
          <div className="editor-work-grid">
            {works.map((work) => <EditorWorkCard key={work.id} work={work} />)}
          </div>
        ) : (
          <div className="editor-empty">
            <h2>Henüz favori yok</h2>
            <p>Keşfettiğiniz eserleri burada biriktirebilirsiniz.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
