import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readingContent } from "@/content";
import { ReadingExperience } from "@/features/reading/components/ReadingExperience";
import { getPublicChapter } from "@/features/works/queries";

export const metadata: Metadata = {
  title: readingContent.chapter.metadataTitle,
  description: readingContent.chapter.metadataDescription,
};

export default async function FirstChapterPage() {
  const chapter = await getPublicChapter("kayip-sehir", "bolum-1");
  if (!chapter) notFound();
  return <ReadingExperience chapter={chapter} />;
}
