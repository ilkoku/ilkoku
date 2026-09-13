import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BatchedEducationGuidePage } from "@/components/content/BatchedEducationGuidePage";
import { getEducationGuideDefinition } from "@/lib/informational-guide-batch";

import "../../batched-education-guide.css";

export const dynamic = "force-dynamic";

const LIVE_INFORMATIONAL_SLUGS = [
  "tarih",
  "felsefe",
  "psikoloji",
  "sosyoloji",
  "kisisel-gelisim",
  "is-dunyasi",
  "girisimcilik",
  "finans",
  "ekonomi",
  "teknoloji",
] as const;

type LiveInformationalSlug = (typeof LIVE_INFORMATIONAL_SLUGS)[number];
type PageProps = { params: Promise<{ slug: string }> };

function isLiveInformationalSlug(slug: string): slug is LiveInformationalSlug {
  return LIVE_INFORMATIONAL_SLUGS.includes(slug as LiveInformationalSlug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isLiveInformationalSlug(slug)) {
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
  if (!isLiveInformationalSlug(slug)) notFound();
  const definition = getEducationGuideDefinition(slug);
  return <BatchedEducationGuidePage definition={definition} />;
}
