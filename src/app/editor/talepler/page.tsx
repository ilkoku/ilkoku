import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { EditorWorksTable } from "@/features/editor-workspace/components/EditorWorksTable";
import {
  getEditorReviewRequests,
  getSecondEditorPoolRequests,
} from "@/features/editor-workspace/queries";

export const metadata: Metadata = {
  title: "Yeni İnceleme Talepleri | İlkOku",
  description: "Yazarların profesyonel editör incelemesi talep ettiği eserler.",
};
export const dynamic = "force-dynamic";

export default async function EditorReviewRequestsPage() {
  const profile = await requireEditorProfile("/editor/talepler");
  const [works, secondEditorWorks] = await Promise.all([
    getEditorReviewRequests(profile.id),
    getSecondEditorPoolRequests(profile.id),
  ]);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Yazarların profesyonel inceleme talebi oluşturduğu ve henüz bir editöre atanmamış eserler."
          title="Yeni İnceleme Talepleri"
        />
        <section className="editor-review-list">
          <EditorPageHeader
            description="Henüz birinci editör tarafından alınmamış profesyonel inceleme talepleri."
            title="Birinci Editör Havuzu"
          />

          {works.length === 0 ? (
            <div className="editor-empty">
              <h2>Bekleyen birinci editör talebi bulunmuyor</h2>
              <p>Yeni talepler oluştuğunda bu havuzda listelenecek.</p>
            </div>
          ) : (
            <EditorWorksTable
              currentEditorId={profile.id}
              mode="requests"
              works={works}
            />
          )}
        </section>

        <section className="editor-review-list">
          <EditorPageHeader
            description="Birinci incelemesi tamamlanmış ve bağımsız ikinci editör bekleyen eserler."
            title="İkinci Editör Havuzu"
          />

          {secondEditorWorks.length === 0 ? (
            <div className="editor-empty">
              <h2>Bekleyen ikinci editör görevi bulunmuyor</h2>
              <p>Genel havuza bırakılan ikinci inceleme görevleri burada listelenecek.</p>
            </div>
          ) : (
            <EditorWorksTable
              currentEditorId={profile.id}
              mode="secondPool"
              works={secondEditorWorks}
            />
          )}
        </section>
      </div>
    </AppShell>
  );
}
