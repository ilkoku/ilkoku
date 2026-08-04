import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readingContent } from "@/content";
import { getChapterComments } from "@/features/reader/comments";
import { getFavoriteStatus } from "@/features/reader/favorites";
import { ReadingExperience } from "@/features/reading/components/ReadingExperience";
import { getReadingProgress } from "@/features/reading/progress";
import { getPublicChapter } from "@/features/works/queries";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: readingContent.chapter.metadataTitle,
  description: readingContent.chapter.metadataDescription,
};

export default async function FirstChapterPage() {
  const chapter = await getPublicChapter(
    "kayip-sehir",
    "bolum-1",
  );

  if (!chapter) {
    notFound();
  }

  const comments =
    await getChapterComments(
      chapter.id,
    );

  const user = await getCurrentUser();
  const readerUser =
    user &&
    (user.role === "reader" || user.role === "editor")
      ? user
      : null;

  const [readingProgress, isFavorite] =
    readerUser
      ? await Promise.all([
          getReadingProgress(
            readerUser.id,
            chapter.work.id,
          ),
          getFavoriteStatus(
            readerUser.id,
            chapter.work.id,
          ),
        ])
      : [null, false];

  return (
    <ReadingExperience
      canComment={Boolean(readerUser)}
      canFavorite={Boolean(readerUser)}
      canTrackReading={Boolean(readerUser)}
      chapter={chapter}
      comments={comments}
      isFavorite={isFavorite}
      readingProgress={readingProgress?.progressPercent ?? null}
    />
  );
}
