import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { readingContent } from "@/content";
import { enforceAdultWorkGate } from "@/features/adult-content/work-gate";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCommerceChapterAccessDecision } from "@/features/commerce/access";
import { EditorReviewReadingMode } from "@/features/editor-workspace/components/EditorReviewReadingMode";
import {
  getActiveEditorReviewAssignment,
  getEditorReviewReturnPath,
} from "@/features/editor-workspace/review-reading-mode";
import { getChapterComments } from "@/features/reader/comments";
import { getFavoriteStatus } from "@/features/reader/favorites";
import { recordReadingAccessSafely } from "@/features/reading/access";
import { FocusedReadingExperience } from "@/features/reading/components/FocusedReadingExperience";
import { PersonalReadingToolsProvider } from "@/features/reading/components/PersonalReadingToolsProvider";
import { PublishedBookToolsContinuity } from "@/features/reading/components/PublishedBookToolsContinuity";
import { getPersonalBookAnnotations } from "@/features/reading/personal-book-annotation-queries";
import { ReadingExperience } from "@/features/reading/components/ReadingExperience";
import { getPersonalAnnotations } from "@/features/reading/personal-annotation-queries";
import { getReadingProgress } from "@/features/reading/progress";
import {
  getMemberPublicChapter,
  getPublicWorkAgeRating,
} from "@/features/works/member-public-queries";
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
  searchParams: Promise<{
    from?: string;
    inceleme?: string;
    sayfa?: string;
  }>;
}) {
  const { chapterSlug, slug } = await params;
  const query = await searchParams;
  const publicReturnTo = getSafeReturnPath(query.from);
  const auth = await getCurrentSessionContext();
  const reviewModeParameter = query.inceleme === "1" ? "&inceleme=1" : "";
  const requestedBookPage = /^\\d{1,5}$/u.test(query.sayfa ?? "")
    ? Number(query.sayfa)
    : null;
  const pageEdgeParameter = query.sayfa === "son"
    ? "&sayfa=son"
    : requestedBookPage !== null ? `&sayfa=${requestedBookPage}` : "";
  const returnPath = `/oku/${slug}/${chapterSlug}?from=${encodeURIComponent(publicReturnTo)}${reviewModeParameter}${pageEdgeParameter}`;

  if (!auth) {
    redirect(`/giris?sonraki=${encodeURIComponent(returnPath)}`);
  }

  const { sessionId, user } = auth;
  await enforceAdultWorkGate({
    returnTo: returnPath,
    slug,
    user,
  });

  const workReference = await getPublicWorkAgeRating(slug);
  if (!workReference) notFound();

  const isEditorReadingContext =
    user.role === "editor" && query.inceleme === "1";

  const reviewAssignment = isEditorReadingContext
    ? await getActiveEditorReviewAssignment({
        editorId: user.id,
        workId: workReference.id,
      })
    : null;

  const isReviewReading =
    isEditorReadingContext && Boolean(reviewAssignment);

  const chapter = await getMemberPublicChapter(
    slug,
    chapterSlug,
    user.id,
    { bypassCommerce: isReviewReading },
  );
  if (!chapter) notFound();

  if (canAccessReaderWorkspace(user.role) && !isReviewReading) {
    const commerceAccess = await getCommerceChapterAccessDecision({
      chapterId: chapter.id,
      readerId: user.id,
      workId: chapter.work.id,
    });

    if (!commerceAccess.allowed) {
      if (commerceAccess.reason === "chapter_not_found") {
        notFound();
      }

      redirect(
        `/satinal/${encodeURIComponent(chapter.work.slug)}?from=${encodeURIComponent(returnPath)}`,
      );
    }
  }

  const requestHeaders = await headers();

  await recordReadingAccessSafely({
    chapterId: chapter.id,
    requestHeaders,
    sessionId,
    userId: user.id,
    workId: chapter.work.id,
  });

  const publishedItem = chapter.publicationLayout && chapter.work.publicationBook
    ? chapter.work.publicationBook.items.find((item) =>
        item.type === "chapter" && item.chapterId === chapter.id,
      ) ?? null
    : null;

  const [comments, personalAnnotations, bookAnnotations] = await Promise.all([
    isReviewReading
      ? Promise.resolve({ items: [], total: 0 })
      : getChapterComments(chapter.id),
    publishedItem ? Promise.resolve([]) : getPersonalAnnotations(user.id, chapter.id),
    publishedItem
      ? getPersonalBookAnnotations(user.id, chapter.work.id, publishedItem.structureItemId)
      : Promise.resolve([]),
  ]);

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

  const returnTo =
    isReviewReading && reviewAssignment
      ? getEditorReviewReturnPath(reviewAssignment.stage)
      : publicReturnTo;

  if (!isReviewReading) {
    const readerExperience = (
      <FocusedReadingExperience
        canComment={Boolean(readerUser)}
        canTrackReading={Boolean(readerUser)}
        chapter={chapter}
        comments={comments}
        protectionIdentity={user.publicId}
        readingProgress={readingProgress?.progressPercent ?? null}
        initialBookPage={requestedBookPage}
        returnTo={returnTo}
        startAtLastPage={query.sayfa === "son"}
      />
    );

    // Published chapters must use the same immutable-book annotation system
    // as authored special pages. Legacy chapter annotations remain untouched.
    return publishedItem ? (
      <PublishedBookToolsContinuity
        initialAnnotations={bookAnnotations}
        publicationItemId={publishedItem.structureItemId}
        userKey={user.publicId}
        workId={chapter.work.id}
      >
        {readerExperience}
      </PublishedBookToolsContinuity>
    ) : (
      <PersonalReadingToolsProvider
        chapterId={chapter.id}
        initialAnnotations={personalAnnotations}
        userKey={user.publicId}
      >
        {readerExperience}
      </PersonalReadingToolsProvider>
    );
  }

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

  return (
    <PersonalReadingToolsProvider
      chapterId={chapter.id}
      initialAnnotations={personalAnnotations}
      userKey={user.publicId}
    >
      <EditorReviewReadingMode
        stage={reviewAssignment?.stage ?? "first"}
        variant="chapter"
      >
        {experience}
      </EditorReviewReadingMode>
    </PersonalReadingToolsProvider>
  );
}
