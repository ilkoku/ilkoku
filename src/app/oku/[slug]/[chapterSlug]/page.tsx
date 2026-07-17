import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readingContent } from "@/content";
import { ReadingExperience } from "@/features/reading/components/ReadingExperience";
import { getPublicChapter } from "@/features/works/queries";

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
  return <ReadingExperience chapter={chapter} />;
}
