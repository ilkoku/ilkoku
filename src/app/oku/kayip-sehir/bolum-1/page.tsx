import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readingContent } from "@/content";
import { ReadingExperience } from "@/features/reading/components/ReadingExperience";
import { recordReadingProgress } from "@/features/reading/progress";
import { getPublicChapter } from "@/features/works/queries";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: readingContent.chapter.metadataTitle,
  description: readingContent.chapter.metadataDescription,
};

export default async function FirstChapterPage() {
  const chapter = await getPublicChapter("kayip-sehir", "bolum-1");
  if (!chapter) notFound();
  const user = await getCurrentUser();
  const readingProgress =
    user?.role === "reader" || user?.role === "editor"
      ? await recordReadingProgress(user.id, chapter)
      : null;

  return (
    <ReadingExperience
      chapter={chapter}
      readingProgress={readingProgress?.progressPercent ?? null}
    />
  );
}
