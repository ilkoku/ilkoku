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

  const canonical = `https://ilkoku.com${readerEducationPublicPath(category)}`;
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.summary,
      inLanguage: "tr-TR",
      mainEntityOfPage: canonical,
      author: { "@type": "Organization", name: "İlkOku", url: "https://ilkoku.com/" },
      publisher: { "@type": "Organization", name: "İlkOku", url: "https://ilkoku.com/" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "https://ilkoku.com/" },
        { "@type": "ListItem", position: 2, name: "Okurlar İçin", item: "https://ilkoku.com/okurlar-icin" },
        { "@type": "ListItem", position: 3, name: guide.title, item: canonical },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <ReaderEducationPage category={category} guide={guide} />
    </>
  );
}
