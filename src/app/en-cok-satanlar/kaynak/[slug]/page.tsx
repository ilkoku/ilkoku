import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookIndexSourceView } from "@/features/book-index/public/BookIndexPublicView";
import { getBookIndexPublicPageContext } from "@/lib/book-index/public-access";
import {
  createBookIndexSourceItemListSchema,
} from "@/lib/book-index/seo";
import {
  getBookIndexPublishedSourcePages,
  getBookIndexSourcePageBySlug,
} from "@/lib/book-index/source-pages";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

const baseUrl = "https://ilkoku.com";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function canonical(slug: string) {
  return `/en-cok-satanlar/kaynak/${slug}`;
}

function description(sourceName: string) {
  return `${sourceName} çok satan kitap listelerini, kaynak sıralamasını değiştirmeden ve güncel veri zamanı ile İlkOku Kitap Endeksi'nde inceleyin.`;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const definition = getBookIndexSourcePageBySlug(slug);
  if (!definition) {
    return createPublicPageMetadata({
      title: "Çok Satan Kitaplar | İlkOku Kitap Endeksi",
      canonical: canonical(slug),
      noIndex: true,
    });
  }

  const context = await getBookIndexPublicPageContext(100);
  const sourcePage = context
    ? getBookIndexPublishedSourcePages(context.model).find(
        (page) => page.slug === slug,
      ) ?? null
    : null;

  return createPublicPageMetadata({
    title: `${definition.searchTitle} ${new Date().getFullYear()} | İlkOku`,
    description: description(definition.sourceName),
    canonical: canonical(slug),
    image: "/en-cok-satanlar/opengraph-image",
    noIndex: !sourcePage,
  });
}

export default async function BookIndexSourcePage({ params }: PageProps) {
  const { slug } = await params;
  const definition = getBookIndexSourcePageBySlug(slug);
  if (!definition) notFound();

  const context = await getBookIndexPublicPageContext(100);
  if (!context) notFound();

  const sourcePage = getBookIndexPublishedSourcePages(context.model).find(
    (page) => page.slug === slug,
  );
  if (!sourcePage) notFound();

  const pageUrl = `${baseUrl}${canonical(slug)}`;
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${definition.searchTitle} ${new Date().getFullYear()}`,
      description: description(definition.sourceName),
      url: pageUrl,
      inLanguage: "tr-TR",
      ...(sourcePage.lastObservedAt
        ? { dateModified: sourcePage.lastObservedAt.toISOString() }
        : {}),
      isPartOf: {
        "@type": "WebSite",
        name: "İlkOku",
        url: baseUrl,
      },
    },
    ...sourcePage.lists.map((list) => ({
      ...createBookIndexSourceItemListSchema({
        name: list.title,
        url: `${pageUrl}#liste-${list.listCode}`,
        items: list.items,
      }),
      "@id": `${pageUrl}#liste-${list.listCode}`,
    })),
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
          name: definition.sourceName,
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
      <BookIndexSourceView sourcePage={sourcePage} />
    </>
  );
}
