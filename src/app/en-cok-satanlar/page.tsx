import type { Metadata } from "next";
import { BookIndexOverviewView } from "@/features/book-index/public/BookIndexPublicView";
import { getBookIndexSoftLaunchPageContext } from "@/lib/book-index/public-access";
import { getBookIndexInsights } from "@/lib/book-index/insights";
import { isGlobalBestsellerPreviewEnabled } from "@/lib/book-index/global-public-read-model";
import { createBookIndexItemListSchema, getBookIndexLastObservedAt } from "@/lib/book-index/seo";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

const baseUrl = "https://ilkoku.com";
const canonical = "/en-cok-satanlar";
function pageTitle() {
  return `En Çok Satan Kitaplar ${new Date().getFullYear()} | İlkOku Kitap Endeksi`;
}

const description =
  "Türkiye'deki kitap satış kaynaklarının çok satan listelerinde hangi kitabın hangi sırada yer aldığını karşılaştırın.";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const context = await getBookIndexSoftLaunchPageContext(30);

  return createPublicPageMetadata({
    title: pageTitle(),
    description,
    canonical,
    image: "/en-cok-satanlar/opengraph-image",
    noIndex: !context.gate.canPublish,
  });
}

export default async function BestsellersPage() {
  const context = await getBookIndexSoftLaunchPageContext(100);
  const previewItems = context.model.turkey.items.filter((item) => item.rank <= 3);
  const showGlobalPreview = isGlobalBestsellerPreviewEnabled();
  const [lastObservedAt, insights] = await Promise.all([
    Promise.resolve(getBookIndexLastObservedAt(context.model)),
    getBookIndexInsights(20),
  ]);
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `İlkOku Kitap Endeksi · En Çok Satan Kitaplar ${new Date().getFullYear()}`,
      description,
      url: `${baseUrl}${canonical}`,
      inLanguage: "tr-TR",
      image: `${baseUrl}/en-cok-satanlar/opengraph-image`,
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
        name: "Türkiye Çok Satan Kaynak Sıralamaları · Güncel Görünüm",
        url: `${baseUrl}${canonical}#turkey-preview`,
        items: previewItems,
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
      {context.gate.canPublish ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      <BookIndexOverviewView
        model={context.model}
        insights={insights}
        showInsightPages={context.gate.canPublish}
        showGlobalPreview={showGlobalPreview}
      />
    </>
  );
}
