import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { readingContent } from "@/content";
import { EditorReviewReadingMode } from "@/features/editor-workspace/components/EditorReviewReadingMode";
import {
  getActiveEditorReviewAssignment,
  getEditorReviewReturnPath,
} from "@/features/editor-workspace/review-reading-mode";
import { getWorkLatestComments } from "@/features/reader/comments";
import { getFavoriteStatus } from "@/features/reader/favorites";
import { getReadingProgress } from "@/features/reading/progress";
import { BookShowcase } from "@/features/showcase/components/BookShowcase";
import { getPublicWorkBySlug } from "@/features/works/queries";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: readingContent.showcase.metadataTitle,
  description: readingContent.showcase.metadataDescription,
};

function getSafeReturnPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/kesfet";
  }

  return value;
}

export default async function DynamicBookShowcasePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const work = await getPublicWorkBySlug(slug);
  if (!work) notFound();

  const user = await getCurrentUser();
  const reviewAssignment =
    user?.role === "editor"
      ? await getActiveEditorReviewAssignment({
          editorId: user.id,
          workId: work.id,
        })
      : null;

  const comments = reviewAssignment
    ? { items: [], total: 0 }
    : await getWorkLatestComments(work.id);

  const readerUser =
    user &&
    !reviewAssignment &&
    (user.role === "reader" || user.role === "editor")
      ? user
      : null;

  const readingProgress = readerUser
    ? await getReadingProgress(readerUser.id, work.id)
    : null;

  const isFavorite = readerUser
    ? await getFavoriteStatus(readerUser.id, work.id)
    : false;

  const returnTo = reviewAssignment
    ? getEditorReviewReturnPath(reviewAssignment.stage)
    : getSafeReturnPath(query.from);

  const showcase = (
    <BookShowcase
      canFavorite={Boolean(readerUser)}
      comments={comments}
      isFavorite={isFavorite}
      readingProgress={readingProgress}
      returnTo={returnTo}
      work={work}
    />
  );

  if (!reviewAssignment) {
    return showcase;
  }

  return (
    <EditorReviewReadingMode
      stage={reviewAssignment.stage}
      variant="showcase"
    >
      {showcase}
    </EditorReviewReadingMode>
  );
}
