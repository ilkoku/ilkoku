import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readingContent } from "@/content";
import { BookShowcase } from "@/features/showcase/components/BookShowcase";
import { getPublicWorkBySlug } from "@/features/works/queries";

export const metadata: Metadata = {
  title: readingContent.showcase.metadataTitle,
  description: readingContent.showcase.metadataDescription,
};

export default async function BookShowcasePage() {
  const work = await getPublicWorkBySlug("kayip-sehir");
  if (!work) notFound();
  return <BookShowcase work={work} />;
}
