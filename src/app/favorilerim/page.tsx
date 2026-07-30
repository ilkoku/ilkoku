import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { ReaderWorksTable } from "@/features/reader/components/ReaderWorksTable";
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

  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const works = await getFavoriteWorks(profile.id);

  const rows = works.map((work) => ({
    authorName: work.authorName,
    chapterCount: work.chapterCount,
    commentCount: 0,
    coverUrl: work.coverUrl,
    editorReviewStatus: work.editorReviewStatus,
    favoriteCount: 1,
    genre: work.genre,
    id: work.id,
    isFavorite: work.isFavorite,
    readerCount: 0,
    slug: work.slug,
    title: work.title,
    totalWords: work.totalWords,
  }));

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Daha sonra yeniden okumak istediğiniz eserleri burada bulabilirsiniz."
          eyebrow="Okuma listeniz"
          title="Favorilerim"
        />

        <ReaderWorksTable
          emptyDescription="Keşfet sayfasındaki eserleri favorilerine ekleyerek okuma listeni oluşturabilirsin."
          emptyTitle="Henüz favori eserin yok"
          rows={rows}
        />
      </div>
    </AppShell>
  );
}
