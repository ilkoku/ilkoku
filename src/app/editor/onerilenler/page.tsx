import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { EditorWorkCard } from "@/features/editor-workspace/components/EditorWorkCard";
import { getEditorRecommendations } from "@/features/editor-workspace/queries";

export const metadata: Metadata = {
  title: "Bana Önerilenler | İlkOku",
};
export const dynamic = "force-dynamic";

export default async function RecommendedWorksPage() {
  const profile = await requireEditorProfile("/editor/onerilenler");
  const recommendations = await getEditorRecommendations(profile.id);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Diğer editörlerin okumanız için paylaştığı eserler."
          title="Bana Önerilenler"
        />
        <div className="editor-work-grid">
          {recommendations.map((recommendation) => (
            <div className="editor-recommendation-card" key={recommendation.id}>
              <p>
                {recommendation.senderEditor.displayName ??
                  recommendation.senderEditor.fullName}{" "}
                önerdi
              </p>
              <EditorWorkCard work={recommendation.work} />
            </div>
          ))}
        </div>
        {recommendations.length === 0 && (
          <div className="editor-empty">
            <h2>Yeni öneri yok</h2>
            <p>Editörlerden gelen eser önerileri burada görünür.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
