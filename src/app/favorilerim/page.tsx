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
    authorUsername: work.authorUsername,
    chapterCount: work.chapterCount,
    commentCount: work.commentCount,
    contentRating: work.contentRating,
    coverUrl: work.coverUrl,
    description: work.description,
    editorReviewStatus:
      work.editorReviewStatus,
    favoriteCount: work.favoriteCount,
    genre: work.genre,
    id: work.id,
    isFavorite: work.isFavorite,
    language: work.language,
    lastReadLabel: work.lastReadLabel,
    progressPercent: work.progressPercent,
    publishedAt:
      work.publishedAt?.toISOString() ??
      null,
    readerCount: work.readerCount,
    readingHref: work.readingHref,
    readingState: work.readingState,
    slug: work.slug,
    title: work.title,
    totalWords: work.totalWords,
    updatedAt:
      work.updatedAt.toISOString(),
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
          returnTo="/favorilerim"
          rows={rows}
        />
      </div>
    </AppShell>
  );
}
