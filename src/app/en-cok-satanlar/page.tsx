import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookIndexOverviewView } from "@/features/book-index/public/BookIndexPublicView";
import { getBookIndexPublicPageContext } from "@/lib/book-index/public-access";
import { createBookIndexItemListSchema, getBookIndexLastObservedAt } from "@/lib/book-index/seo";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

const baseUrl = "https://ilkoku.com";
const canonical = "/en-cok-satanlar";
const title = "En Çok Satan Kitaplar | İlkOku Kitap Endeksi";
const description =
  "Türkiye'deki bağımsız kitap satış kaynaklarının çok satan sinyallerini ve İlkOku Türkiye Kitap Endeksi'ni şeffaf biçimde inceleyin.";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const context = await getBookIndexPublicPageContext(30);

  return createPublicPageMetadata({
    title,
    description,
    canonical,
    noIndex: !context,
  });
}

export default async function BestsellersPage() {
  const context = await getBookIndexPublicPageContext(30);
  if (!context) notFound();

  const lastObservedAt = getBookIndexLastObservedAt(context.model);
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "İlkOku Kitap Endeksi · En Çok Satan Kitaplar",
      description,
      url: `${baseUrl}${canonical}`,
      inLanguage: "tr-TR",
      ...(lastObservedAt ? { dateModified: lastObservedAt.toISOString() } : {}),
      mainEntity: {
        "@id": `${baseUrl}${canonical}#turkey-preview`,
      },
      isPartOf: {
        "@type": "WebSite",
        name: "İlkOku",
        url: baseUrl,
      },
    },
    {
      ...createBookIndexItemListSchema({
        name: "İlkOku Türkiye Kitap Endeksi · Güncel İlk 30",
        url: `${baseUrl}${canonical}#turkey-preview`,
        items: context.model.turkey.items,
      }),
      "@id": `${baseUrl}${canonical}#turkey-preview`,
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
      <BookIndexOverviewView model={context.model} />
    </>
  );
}
