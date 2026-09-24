import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReaderEducationPage } from "@/components/content/ReaderEducationPage";
import { getReaderEducationGuideRecord } from "@/lib/cms-reader-education";
import {
  READER_EDUCATION_CATEGORIES,
  getReaderEducationCategory,
  readerEducationPublicPath,
} from "@/lib/reader-education";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return READER_EDUCATION_CATEGORIES.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getReaderEducationCategory(slug);
  if (!category) {
    return { title: "Eğitim bulunamadı | İlkOku", robots: { index: false, follow: false } };
  }

  const canonical = `https://ilkoku.com${readerEducationPublicPath(category)}`;
  return {
    title: category.seoTitle,
    description: category.seoDescription,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title: category.seoTitle,
      description: category.seoDescription,
      type: "article",
      locale: "tr_TR",
      url: canonical,
    },
    twitter: {
      card: "summary",
      title: category.seoTitle,
      description: category.seoDescription,
    },
  };
}

export default async function ReaderEducationRoute({ params }: PageProps) {
  const { slug } = await params;
  const category = getReaderEducationCategory(slug);
  if (!category) notFound();

  const guide = await getReaderEducationGuideRecord(category.slug);
  if (!guide) notFound();

  return <ReaderEducationPage category={category} guide={guide} />;
}
