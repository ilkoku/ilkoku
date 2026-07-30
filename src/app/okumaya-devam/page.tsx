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

export default async function ContinueReadingPage() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/giris?sonraki=/okumaya-devam");
  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const progressRecords = await getContinueReading(profile.id, 100);
  const rows: ReaderWorkRow[] = progressRecords.map((progress) => ({
    authorName: progress.work.author.displayName ?? progress.work.author.fullName,
    chapterCount: progress.work.chapters.length,
    commentCount: 0,
    coverUrl: null,
    editorReviewStatus: progress.work.editorReviewStatus,
    favoriteCount: 0,
    genre: progress.work.genre,
    id: progress.work.id,
    lastReadLabel: progress.chapter.title,
    progressPercent: progress.progressPercent,
    readerCount: 0,
    readingHref: `/oku/${progress.work.slug}/bolum-${progress.chapter.position}`,
    slug: progress.work.slug,
    title: progress.work.title,
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
