import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";
import { notFound } from "next/navigation";

import { BatchedEducationGuidePage } from "@/components/content/BatchedEducationGuidePage";
import { getEducationGuideDefinition } from "@/lib/informational-guide-batch";

import "../../batched-education-guide.css";

export const revalidate = 300;

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
  "yapay-zeka",
  "programlama",
  "hukuk",
  "egitim",
  "siyaset",
  "iletisim",
  "sanat",
  "mimarlik",
  "saglik",
  "spor",
  "yemek-ve-gastronomi",
  "seyahat",
  "din-ve-inanc",
] as const;

export function generateStaticParams() {
  return LIVE_INFORMATIONAL_SLUGS.map((slug) => ({ slug }));
}

type LiveInformationalSlug = (typeof LIVE_INFORMATIONAL_SLUGS)[number];
type PageProps = { params: Promise<{ slug: string }> };

function isInformationalGuideSlug(slug: string): slug is LiveInformationalSlug {
  return LIVE_INFORMATIONAL_SLUGS.includes(slug as LiveInformationalSlug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isInformationalGuideSlug(slug)) {
    return { title: "Eğitim bulunamadı | İlkOku", robots: { index: false, follow: false } };
  }
  const definition = getEducationGuideDefinition(slug);
  return createPublicPageMetadata({
    title: `${definition.title} | İlkOku`,
    description: definition.description,
    canonical: `/yazarlar-icin/bilgilendirici/${slug}`,
  });
}

export default async function InformationalGuidePage({ params }: PageProps) {
  const { slug } = await params;
  if (!isInformationalGuideSlug(slug)) notFound();
  const definition = getEducationGuideDefinition(slug);
  return <BatchedEducationGuidePage definition={definition} />;
}
