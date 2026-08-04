import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readingContent } from "@/content";
import { getChapterComments } from "@/features/reader/comments";
import { getFavoriteStatus } from "@/features/reader/favorites";
import { ReadingExperience } from "@/features/reading/components/ReadingExperience";
import { getReadingProgress } from "@/features/reading/progress";
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

  const comments =
    await getChapterComments(
      chapter.id,
    );

  const user = await getCurrentUser();

  const reviewAssignment =
    user?.role === "editor"
      ? await prisma.editorReviewAssignment.findFirst({
          where: {
            editorId: user.id,
            workId: chapter.work.id,
            OR: [
              {
                stage: "first",
                status: "in_progress",
                work: {
                  assignedEditorId: user.id,
                  editorReviewStatus: "in_progress",
                },
              },
              {
                stage: "second",
                status: {
                  in: ["assigned", "in_progress"],
                },
                work: {
                  assignedEditorId: {
                    not: user.id,
                  },
                  editorReviewStatus: "second_in_progress",
                },
              },
            ],
          },
          select: {
            id: true,
            stage: true,
          },
        })
      : null;

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

  const draft =
    user?.role === "editor" && reviewAssignment
      ? await prisma.editorFeedback.findFirst({
          where: {
            editorId: user.id,
            isProfessionalReview: true,
            reportStatus: "draft",
            workId: chapter.work.id,
            OR: [
              {
                assignmentId: reviewAssignment.id,
              },
              {
                assignmentId: null,
              },
            ],
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
      canComment={Boolean(readerUser)}
      canFavorite={Boolean(readerUser)}
      canTrackReading={Boolean(readerUser)}
      chapter={chapter}
      comments={comments}
      isFavorite={isFavorite}
      readingProgress={readingProgress?.progressPercent ?? null}
      professionalReview={
        reviewAssignment
          ? {
              draft,
              stage: reviewAssignment.stage,
              workId: chapter.work.id,
            }
          : null
      }
    />
  );
}
