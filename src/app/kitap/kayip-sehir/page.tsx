import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readingContent } from "@/content";
import { getWorkLatestComments } from "@/features/reader/comments";
import { getFavoriteStatus } from "@/features/reader/favorites";
import { getReadingProgress } from "@/features/reading/progress";
import { BookShowcase } from "@/features/showcase/components/BookShowcase";
import { getPublicWorkBySlug } from "@/features/works/queries";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: readingContent.showcase.metadataTitle,
  description: readingContent.showcase.metadataDescription,
};

export default async function BookShowcasePage() {
  const work = await getPublicWorkBySlug("kayip-sehir");

  if (!work) {
    notFound();
  }

  const comments =
    await getWorkLatestComments(
      work.id,
    );

  const user = await getCurrentUser();
  const readerUser =
    user && (user.role === "reader" || user.role === "editor")
      ? user
      : null;
  const readingProgress = readerUser
    ? await getReadingProgress(readerUser.id, work.id)
    : null;
  const isFavorite = readerUser
    ? await getFavoriteStatus(readerUser.id, work.id)
    : false;

  return (
    <BookShowcase
      canFavorite={Boolean(readerUser)}
      comments={comments}
      isFavorite={isFavorite}
      readingProgress={readingProgress}
      work={work}
    />
  );
}
