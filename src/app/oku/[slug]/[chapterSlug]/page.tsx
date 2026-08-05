import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { readingContent } from "@/content";
import { EditorReviewReadingMode } from "@/features/editor-workspace/components/EditorReviewReadingMode";
import {
  getActiveEditorReviewAssignment,
  getEditorReviewReturnPath,
} from "@/features/editor-workspace/review-reading-mode";
import { getChapterComments } from "@/features/reader/comments";
import { getFavoriteStatus } from "@/features/reader/favorites";
import { recordReadingAccessSafely } from "@/features/reading/access";
import { ReadingExperience } from "@/features/reading/components/ReadingExperience";
import { getReadingProgress } from "@/features/reading/progress";
import { getPublicChapter } from "@/features/works/queries";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: readingContent.chapter.metadataTitle,
  description: readingContent.chapter.metadataDescription,
  robots: { index: false, follow: false },
};

function getSafeReturnPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/kesfet";
  }

  return value;
}

export default async function DynamicReadingPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapterSlug: string; slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { chapterSlug, slug } = await params;
  const query = await searchParams;
  const auth = await getCurrentSessionContext();

  if (!auth) {
    const returnPath = `/oku/${slug}/${chapterSlug}`;
    redirect(`/giris?sonraki=${encodeURIComponent(returnPath)}`);
  }

  const { sessionId, user } = auth;
  const chapter = await getPublicChapter(slug, chapterSlug);

  if (!chapter) notFound();

  const reviewAssignment =
    user.role === "editor"
      ? await getActiveEditorReviewAssignment({
          editorId: user.id,
          workId: chapter.work.id,
        })
      : null;

  if (!reviewAssignment) {
    const requestHeaders = await headers();

    await recordReadingAccessSafely({
      chapterId: chapter.id,
      requestHeaders,
      sessionId,
      userId: user.id,
      workId: chapter.work.id,
    });
  }

  const comments = reviewAssignment
    ? { items: [], total: 0 }
    : await getChapterComments(chapter.id);

  const readerUser =
    !reviewAssignment &&
    (user.role === "reader" || user.role === "editor")
      ? user
      : null;

  const [readingProgress, isFavorite] = readerUser
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
    user.role === "editor" && reviewAssignment
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

  const returnTo = reviewAssignment
    ? getEditorReviewReturnPath(reviewAssignment.stage)
    : getSafeReturnPath(query.from);

  const experience = (
    <ReadingExperience
      canComment={Boolean(readerUser)}
      canFavorite={Boolean(readerUser)}
      canTrackReading={Boolean(readerUser)}
      chapter={chapter}
      comments={comments}
      isFavorite={isFavorite}
      protectionIdentity={user.publicId}
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
      returnTo={returnTo}
    />
  );

  if (!reviewAssignment) {
    return experience;
  }

  return (
    <EditorReviewReadingMode
      stage={reviewAssignment.stage}
      variant="chapter"
    >
      {experience}
    </EditorReviewReadingMode>
  );
}
