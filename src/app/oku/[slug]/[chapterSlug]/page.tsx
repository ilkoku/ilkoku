import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readingContent } from "@/content";
import { ReadingExperience } from "@/features/reading/components/ReadingExperience";
import { recordReadingProgress } from "@/features/reading/progress";
import { getPublicChapter } from "@/features/works/queries";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: readingContent.chapter.metadataTitle,
  description: readingContent.chapter.metadataDescription,
};

export default async function DynamicReadingPage({
  params,
}: {
  params: Promise<{ chapterSlug: string; slug: string }>;
}) {
  const { chapterSlug, slug } = await params;
  const chapter = await getPublicChapter(slug, chapterSlug);
  if (!chapter) notFound();

  const user = await getCurrentUser();
  const canUseProfessionalTools =
    user?.role === "editor" &&
    chapter.work.assignedEditorId === user.id &&
    chapter.work.editorReviewStatus === "in_progress";
  const readingProgress =
    user?.role === "reader" || user?.role === "editor"
      ? await recordReadingProgress(user.id, chapter)
      : null;

  const draft = canUseProfessionalTools
    ? await prisma.editorFeedback.findFirst({
        where: {
          editorId: user.id,
          isProfessionalReview: true,
          reportStatus: "draft",
          workId: chapter.work.id,
        },
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          category: true,
          content: true,
          priority: true,
          title: true,
        },
      })
    : null;

  return (
    <ReadingExperience
      chapter={chapter}
      readingProgress={readingProgress?.progressPercent ?? null}
      professionalReview={
        canUseProfessionalTools
          ? {
              draft,
              workId: chapter.work.id,
            }
          : null
      }
    />
  );
}
