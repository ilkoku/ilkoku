import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BatchedEducationGuidePage } from "@/components/content/BatchedEducationGuidePage";
import { getEducationGuideDefinition, isInformationalGuideSlug } from "@/lib/informational-guide-batch";

import "../../batched-education-guide.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isInformationalGuideSlug(slug)) {
    return { title: "Eğitim bulunamadı | İlkOku", robots: { index: false, follow: false } };
  }
  const definition = getEducationGuideDefinition(slug);
  return {
    title: `${definition.title} | İlkOku`,
    description: definition.description,
    robots: { index: false, follow: false },
  };
}

export default async function InformationalGuidePage({ params }: PageProps) {
  const { slug } = await params;
  if (!isInformationalGuideSlug(slug)) notFound();
  const definition = getEducationGuideDefinition(slug);
  return <BatchedEducationGuidePage definition={definition} />;
}
