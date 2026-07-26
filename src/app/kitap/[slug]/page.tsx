import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readingContent } from "@/content";
import { getFavoriteStatus } from "@/features/reader/favorites";
import { getReadingProgress } from "@/features/reading/progress";
import { BookShowcase } from "@/features/showcase/components/BookShowcase";
import { getPublicWorkBySlug } from "@/features/works/queries";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: readingContent.showcase.metadataTitle,
  description: readingContent.showcase.metadataDescription,
};

export default async function DynamicBookShowcasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const work = await getPublicWorkBySlug(slug);
  if (!work) notFound();
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
      isFavorite={isFavorite}
      readingProgress={readingProgress}
      work={work}
    />
  );
}
