import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { readingContent } from "@/content";
import { enforceAdultWorkGate } from "@/features/adult-content/work-gate";
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
import { getMemberPublicChapter } from "@/features/works/member-public-queries";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const MAX_RETURN_PATH_LENGTH = 1500;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: readingContent.chapter.metadataTitle,
  description: readingContent.chapter.metadataDescription,
  robots: { index: false, follow: false },
};

function getSafeReturnPath(value: string | undefined) {
  if (
    !value ||
    value.length > MAX_RETURN_PATH_LENGTH ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/eserler";
  }

  return value;
}

export default async function DynamicReadingPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapterSlug: string; slug: string }>;
  searchParams: Promise<{ from?: string; inceleme?: string }>;
}) {
  const { chapterSlug, slug } = await params;
  const query = await searchParams;
  const publicReturnTo = getSafeReturnPath(query.from);
  const auth = await getCurrentSessionContext();
  const reviewModeParameter = query.inceleme === "1" ? "&inceleme=1" : "";
  const directReturnPath = `/oku/${slug}/${chapterSlug}?from=${encodeURIComponent(publicReturnTo)}${reviewModeParameter}`;

  if (!auth) {
    redirect(`/giris?sonraki=${encodeURIComponent(directReturnPath)}`);
  }

  const { sessionId, user } = auth;
  await enforceAdultWorkGate({
    returnTo: directReturnPath,
    slug,
    user,
  });

  const chapter = await getMemberPublicChapter(slug, chapterSlug, user.id);
  if (!chapter) notFound();

  const reviewAssignment =
    user.role === "editor"
      ? await getActiveEditorReviewAssignment({
          editorId: user.id,
          workId: chapter.work.id,
        })
      : null;

  const isEditorReadingContext =
    user.role === "editor" &&
    (query.inceleme === "1" ||
      query.from?.startsWith("/editor/") === true);

  const isReviewReading =
    Boolean(reviewAssignment) || isEditorReadingContext;

  const requestHeaders = await headers();

  await recordReadingAccessSafely({
    chapterId: chapter.id,
    requestHeaders,
    sessionId,
    userId: user.id,
    workId: chapter.work.id,
  });

  const comments = isReviewReading
    ? { items: [], total: 0 }
    : await getChapterComments(chapter.id);

  const readerUser =
    user.role === "reader" || user.role === "editor"
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
    : publicReturnTo;

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

  if (!isReviewReading) {
    return experience;
  }

  return (
    <EditorReviewReadingMode
      stage={reviewAssignment?.stage ?? "first"}
      variant="chapter"
    >
      {experience}
    </EditorReviewReadingMode>
  );
}
