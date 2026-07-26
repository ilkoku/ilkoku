import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";

export const metadata: Metadata = {
  title: "Editör Profilim | İlkOku",
};
export const dynamic = "force-dynamic";

export default async function EditorProfilePage() {
  const profile = await requireEditorProfile("/editor/profil");

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Okur ve editör kimliğiniz aynı İlkOku hesabında birlikte çalışır."
          title="Profil"
        />
        <section className="editor-profile-card">
          <span aria-hidden="true">
            {profile.fullName.charAt(0).toLocaleUpperCase("tr")}
          </span>
          <div>
            <p>Doğrulanmış editör</p>
            <h2>{profile.fullName}</h2>
            <small>Profesyonel editör araçları etkin.</small>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
