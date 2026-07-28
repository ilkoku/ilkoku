import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { EditorWorksTable } from "@/features/editor-workspace/components/EditorWorksTable";
import { getEditorReviewRequests } from "@/features/editor-workspace/queries";

export const metadata: Metadata = {
  title: "Yeni İnceleme Talepleri | İlkOku",
  description: "Yazarların profesyonel editör incelemesi talep ettiği eserler.",
};
export const dynamic = "force-dynamic";

export default async function EditorReviewRequestsPage() {
  const profile = await requireEditorProfile("/editor/talepler");
  const works = await getEditorReviewRequests(profile.id);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Yazarların profesyonel inceleme talebi oluşturduğu ve henüz bir editöre atanmamış eserler."
          title="Yeni İnceleme Talepleri"
        />
        {works.length === 0 ? (
          <div className="editor-empty">
            <h2>Bekleyen inceleme talebi bulunmuyor</h2>
            <p>Yeni talepler oluştuğunda bu havuzda listelenecek.</p>
          </div>
        ) : (
          <EditorWorksTable currentEditorId={profile.id} mode="requests" works={works} />
        )}
      </div>
    </AppShell>
  );
}
