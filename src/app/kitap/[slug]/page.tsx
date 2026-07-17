import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readingContent } from "@/content";
import { BookShowcase } from "@/features/showcase/components/BookShowcase";
import { getPublicWorkBySlug } from "@/features/works/queries";

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
  return <BookShowcase work={work} />;
}
