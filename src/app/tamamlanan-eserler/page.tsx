import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import {
  ReaderWorksTable,
  type ReaderWorkRow,
} from "@/features/reader/components/ReaderWorksTable";
import { getCompletedReading } from "@/features/reading/progress";

export const metadata: Metadata = {
  description:
    "Okumayı tamamladığınız eserleri görüntüleyin.",
  title: "Tamamlanan Eserler | İlkOku",
};

export const dynamic = "force-dynamic";

function countWords(content: string) {
  const normalized = content.trim();

  return normalized
    ? normalized.split(/\s+/u).length
    : 0;
}

export default async function CompletedWorksPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(
      "/giris?sonraki=/tamamlanan-eserler",
    );
  }

  if (!canAccessReaderWorkspace(profile.role)) {
    redirect(
      "/erisim-reddedildi?kaynak=reader",
    );
  }

  const records = await getCompletedReading(
    profile.id,
    100,
  );

  const rows: ReaderWorkRow[] =
    records.map((progress) => {
      const firstChapter =
        progress.work.chapters[0] ?? null;

      return {
        authorName:
          progress.work.author.displayName ??
          progress.work.author.fullName,
        authorUsername:
          progress.work.author.username,
        chapterCount:
          progress.work.chapters.length,
        commentCount:
          progress.work._count.comments,
        completedAt:
          progress.completedAt?.toISOString() ??
          null,
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
          100,
        publishedAt:
          progress.work.publishedAt?.toISOString() ??
          null,
        readerCount:
          progress.work._count.readingProgress,
        readingHref:
          firstChapter
            ? `/oku/${progress.work.slug}/bolum-${firstChapter.position}`
            : null,
        readingState:
          "completed",
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
      };
    });

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Baştan sona okuduğunuz eserleri görüntüleyin veya yeniden okumaya başlayın."
          eyebrow="Okuma arşiviniz"
          title="Tamamlanan Eserler"
        />

        <ReaderWorksTable
          emptyDescription="Bir eserin son bölümünü tamamladığınızda eser burada görünecek."
          emptyTitle="Henüz tamamladığınız bir eser yok"
          returnTo="/tamamlanan-eserler"
          rows={rows}
        />
      </div>
    </AppShell>
  );
}
