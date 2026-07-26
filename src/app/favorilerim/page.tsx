import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { EditorWorkCard } from "@/features/editor-workspace/components/EditorWorkCard";
import { getFavoriteWorks } from "@/features/reader/favorites";

export const metadata: Metadata = {
  description: "Favori eserlerinizi görüntüleyin.",
  title: "Favorilerim | İlkOku",
};

export const dynamic = "force-dynamic";

export default async function ReaderFavoritesPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/favorilerim");
  }

  if (profile.role !== "reader" && profile.role !== "editor") {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const works = await getFavoriteWorks(profile.id);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Daha sonra yeniden okumak istediğiniz eserleri burada bulabilirsiniz."
          eyebrow="Okuma listeniz"
          title="Favorilerim"
        />

        {works.length > 0 ? (
          <div className="editor-work-grid">
            {works.map((work) => (
              <EditorWorkCard
                context="reader"
                key={work.id}
                work={work}
              />
            ))}
          </div>
        ) : (
          <div className="editor-empty">
            <h2>Henüz favori eserin yok</h2>
            <p>
              Keşfet sayfasındaki eserleri favorilerine ekleyerek okuma
              listeni oluşturabilirsin.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
