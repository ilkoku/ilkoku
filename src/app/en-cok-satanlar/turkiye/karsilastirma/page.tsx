import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TurkeyBookIndexComparisonView } from "@/features/book-index/public/BookIndexPublicView";
import { getBookIndexSoftLaunchPageContext } from "@/lib/book-index/public-access";
import { getBookIndexLastObservedAt } from "@/lib/book-index/seo";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";
import { isSoftLaunchSearchExcludedPath } from "@/lib/soft-launch-search-policy";

const baseUrl = "https://ilkoku.com";
const canonical = "/en-cok-satanlar/turkiye/karsilastirma";

const title = "En Çok Satanlar Karşılaştırma | İlkOku";
const description =
  "Türkiye'deki kitap satış kanallarının en çok satanlar listelerini yan yana karşılaştırın. 2–4 kitap satış kanalı seçerek aynı sıradaki kitapları inceleyin.";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const context = await getBookIndexSoftLaunchPageContext(100);

  return createPublicPageMetadata({
    title,
    description,
    canonical,
    image: "/en-cok-satanlar/opengraph-image",
    noIndex: isSoftLaunchSearchExcludedPath(canonical) || !context.gate.canPublish,
  });
}

export default async function TurkeyBestsellerComparisonPage() {
  const context = await getBookIndexSoftLaunchPageContext(1200);
  const searchIndexable = context.gate.canPublish && !isSoftLaunchSearchExcludedPath(canonical);
  if (context.model.turkey.availability !== "available") notFound();

  const lastObservedAt = getBookIndexLastObservedAt(context.model);
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "En Çok Satanlar Karşılaştırma",
      description,
      url: `${baseUrl}${canonical}`,
      inLanguage: "tr-TR",
      image: `${baseUrl}/en-cok-satanlar/opengraph-image`,
      ...(lastObservedAt ? { dateModified: lastObservedAt.toISOString() } : {}),
      isPartOf: {
        "@type": "WebSite",
        name: "İlkOku",
        url: baseUrl,
      },
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
          item: `${baseUrl}/en-cok-satanlar/turkiye`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: "En Çok Satanlar Karşılaştırma",
          item: `${baseUrl}${canonical}`,
        },
      ],
    },
  ];

  return (
    <>
      {searchIndexable ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      <TurkeyBookIndexComparisonView model={context.model} />
    </>
  );
}
