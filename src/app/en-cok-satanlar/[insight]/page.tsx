import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookIndexInsightView } from "@/features/book-index/public/BookIndexPublicView";
import {
  getBookIndexInsightItems,
  getBookIndexInsightPage,
} from "@/lib/book-index/insight-pages";
import { getBookIndexInsights } from "@/lib/book-index/insights";
import { getBookIndexPublicPageContext } from "@/lib/book-index/public-access";
import { createBookIndexGenericItemListSchema } from "@/lib/book-index/seo";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

const baseUrl = "https://ilkoku.com";

type PageProps = {
  params: Promise<{ insight: string }>;
};

function canonical(slug: string) {
  return `/en-cok-satanlar/${slug}`;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { insight: slug } = await params;
  const definition = getBookIndexInsightPage(slug);

  if (!definition) {
    return createPublicPageMetadata({
      title: "En Çok Satan Kitaplar | İlkOku",
      canonical: canonical(slug),
      noIndex: true,
    });
  }

  const context = await getBookIndexPublicPageContext(100);
  if (!context) {
    return createPublicPageMetadata({
      title: `${definition.searchTitle} | İlkOku`,
      description: definition.description,
      canonical: canonical(slug),
      image: "/en-cok-satanlar/opengraph-image",
      noIndex: true,
    });
  }

  const insights = await getBookIndexInsights(50);
  const items = getBookIndexInsightItems(insights, definition.key);

  return createPublicPageMetadata({
    title: `${definition.searchTitle} ${new Date().getFullYear()} | İlkOku`,
    description: definition.description,
    canonical: canonical(slug),
    image: "/en-cok-satanlar/opengraph-image",
    noIndex: items.length === 0,
  });
}

export default async function BookIndexInsightPage({ params }: PageProps) {
  const { insight: slug } = await params;
  const definition = getBookIndexInsightPage(slug);
  if (!definition) notFound();

  const context = await getBookIndexPublicPageContext(100);
  if (!context) notFound();

  const insights = await getBookIndexInsights(50);
  const items = getBookIndexInsightItems(insights, definition.key);
  if (items.length === 0) notFound();

  const pageUrl = `${baseUrl}${canonical(slug)}`;
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${definition.searchTitle} ${new Date().getFullYear()}`,
      description: definition.description,
      url: pageUrl,
      image: `${baseUrl}/en-cok-satanlar/opengraph-image`,
      inLanguage: "tr-TR",
      dateModified: insights.generatedAt.toISOString(),
      isPartOf: {
        "@type": "WebSite",
        name: "İlkOku",
        url: baseUrl,
      },
      mainEntity: {
        "@id": `${pageUrl}#liste`,
      },
    },
    {
      ...createBookIndexGenericItemListSchema({
        name: definition.heading,
        url: `${pageUrl}#liste`,
        items,
      }),
      "@id": `${pageUrl}#liste`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Ana Sayfa",
          item: `${baseUrl}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "En Çok Satanlar",
          item: `${baseUrl}/en-cok-satanlar`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: definition.eyebrow,
          item: pageUrl,
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemas).replace(/</g, "\\u003c"),
        }}
      />
      <BookIndexInsightView definition={definition} insights={insights} />
    </>
  );
}
