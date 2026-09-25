import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TurkeyBookIndexView } from "@/features/book-index/public/BookIndexPublicView";
import { getBookIndexPublicPageContext } from "@/lib/book-index/public-access";
import { createBookIndexItemListSchema, getBookIndexLastObservedAt } from "@/lib/book-index/seo";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

const baseUrl = "https://ilkoku.com";
const canonical = "/en-cok-satanlar/turkiye";
function pageTitle() {
  return `Türkiye'de En Çok Satan Kitaplar ${new Date().getFullYear()} | İlkOku`;
}

const description =
  "Birden fazla bağımsız Türkiye kaynağındaki çok satan sıralamalarından oluşturulan İlkOku Türkiye Kitap Endeksi'ni inceleyin.";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const context = await getBookIndexPublicPageContext(100);

  return createPublicPageMetadata({
    title: pageTitle(),
    description,
    canonical,
    image: "/en-cok-satanlar/opengraph-image",
    noIndex: !context,
  });
}

export default async function TurkeyBestsellersPage() {
  const context = await getBookIndexPublicPageContext(100);
  if (!context || context.model.turkey.availability !== "available") notFound();

  const lastObservedAt = getBookIndexLastObservedAt(context.model);
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `İlkOku Türkiye Kitap Endeksi · ${new Date().getFullYear()}`,
      description,
      url: `${baseUrl}${canonical}`,
      inLanguage: "tr-TR",
      ...(lastObservedAt ? { dateModified: lastObservedAt.toISOString() } : {}),
      mainEntity: {
        "@id": `${baseUrl}${canonical}#ranking`,
      },
      isPartOf: {
        "@type": "WebSite",
        name: "İlkOku",
        url: baseUrl,
      },
    },
    {
      ...createBookIndexItemListSchema({
        name: "Türkiye'de En Çok Satan Kitaplar",
        url: `${baseUrl}${canonical}#ranking`,
        items: context.model.turkey.items,
      }),
      "@id": `${baseUrl}${canonical}#ranking`,
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
          name: "Türkiye",
          item: `${baseUrl}${canonical}`,
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <TurkeyBookIndexView model={context.model} />
    </>
  );
}
