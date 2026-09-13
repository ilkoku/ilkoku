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
  return {
    title: `${definition.title} | İlkOku`,
    description: definition.description,
    alternates: { canonical: `https://ilkoku.com/yazarlar-icin/bilgilendirici/${slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function InformationalGuidePage({ params }: PageProps) {
  const { slug } = await params;
  if (!isInformationalGuideSlug(slug)) notFound();
  const definition = getEducationGuideDefinition(slug);
  return <BatchedEducationGuidePage definition={definition} />;
}
