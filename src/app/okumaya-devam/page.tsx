import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { ReaderWorksTable, type ReaderWorkRow } from "@/features/reader/components/ReaderWorksTable";
import { getContinueReading } from "@/features/reading/progress";

export const metadata: Metadata = {
  description: "Başladığınız eserlere kaldığınız yerden devam edin.",
  title: "Okumaya Devam Et | İlkOku",
};

export const dynamic = "force-dynamic";

function countWords(content: string) {
  const normalized = content.trim();

  return normalized
    ? normalized.split(/\s+/u).length
    : 0;
}

export default async function ContinueReadingPage() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/giris?sonraki=/okumaya-devam");
  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const progressRecords = await getContinueReading(profile.id, 100);
  const rows: ReaderWorkRow[] =
    progressRecords.map((progress) => ({
      authorName:
        progress.work.author.displayName ??
        progress.work.author.fullName,
      authorUsername:
        progress.work.author.username,
      chapterCount:
        progress.work.chapters.length,
      commentCount:
        progress.work._count.comments,
      contentRating:
        progress.work.contentRating,
      coverUrl:
        progress.work.coverUrl,
      description:
        progress.work.description,
      editorReviewStatus:
        progress.work.editorReviewStatus,
      favoriteCount:
        progress.work._count.favorites,
      genre:
        progress.work.genre,
      id:
        progress.work.id,
      isFavorite:
        progress.work.favorites.length > 0,
      language:
        progress.work.language,
      lastReadLabel:
        progress.chapter.title,
      progressPercent:
        progress.progressPercent,
      publishedAt:
        progress.work.publishedAt?.toISOString() ??
        null,
      readerCount:
        progress.work._count.readingProgress,
      readingHref:
        `/oku/${progress.work.slug}/bolum-${progress.chapter.position}`,
      slug:
        progress.work.slug,
      title:
        progress.work.title,
      totalWords:
        progress.work.chapters.reduce(
          (total, chapter) =>
            total +
            countWords(chapter.content),
          0,
        ),
      updatedAt:
        progress.work.updatedAt.toISOString(),
    }));

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Başladığınız eserleri ve kaldığınız son bölümü tek listede görüntüleyin."
          eyebrow="Okuma listeniz"
          title="Okumaya Devam Et"
        />
        <ReaderWorksTable
          emptyDescription="Bir eseri okumaya başladığınızda kaldığınız bölüm burada görünecek."
          emptyTitle="Henüz devam eden bir okumanız yok"
          returnTo="/okumaya-devam"
          rows={rows}
        />
      </div>
    </AppShell>
  );
}
