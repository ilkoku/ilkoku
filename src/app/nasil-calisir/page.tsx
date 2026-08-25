import type { Metadata } from "next";
import { cache } from "react";

import { PublicEditorialDocument } from "@/components/content/PublicEditorialDocument";
import { howItWorksPageContent } from "@/content/how-it-works";
import { getPublishedCmsPublicPageState } from "@/lib/cms-public-page-store";

const baseUrl = "https://ilkoku.com";

export const dynamic = "force-dynamic";

const resolvePage = cache(async () => {
  const state = await getPublishedCmsPublicPageState("nasil-calisir");

  if (state.state === "valid") {
    return {
      body: state.page.body,
      canonical: state.page.canonicalUrl || howItWorksPageContent.canonical,
      noIndex: state.page.noIndex,
      seoDescription: state.page.seoDescription || state.page.summary || howItWorksPageContent.seoDescription,
      seoTitle: state.page.seoTitle || state.page.title,
      summary: state.page.summary || howItWorksPageContent.summary,
      title: state.page.title,
      updatedAt: state.page.updatedAt,
    };
  }

  return {
    body: howItWorksPageContent.body,
    canonical: howItWorksPageContent.canonical,
    noIndex: false,
    seoDescription: howItWorksPageContent.seoDescription,
    seoTitle: howItWorksPageContent.seoTitle,
    summary: howItWorksPageContent.summary,
    title: howItWorksPageContent.title,
    updatedAt: new Date(howItWorksPageContent.updatedAt),
  };
});

export async function generateMetadata(): Promise<Metadata> {
  const page = await resolvePage();

  return {
    title: page.seoTitle,
    description: page.seoDescription,
    alternates: { canonical: page.canonical },
    robots: page.noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title: page.seoTitle,
      description: page.seoDescription,
      type: "website",
      locale: "tr_TR",
      url: page.canonical,
    },
  };
}

export default async function HowItWorksPage() {
  const page = await resolvePage();
  const absoluteUrl = new URL(page.canonical, baseUrl).toString();
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.title,
      description: page.seoDescription,
      inLanguage: "tr-TR",
      url: absoluteUrl,
      dateModified: page.updatedAt.toISOString(),
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
          item: baseUrl + "/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: page.title,
          item: absoluteUrl,
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
      <PublicEditorialDocument
        eyebrow="İlkOku'da eser yolculuğu"
        title={page.title}
        summary={page.summary}
        body={page.body}
        backHref="/"
        backLabel="Ana sayfa"
        updatedAt={page.updatedAt}
        relatedLinks={[
          {
            href: "/eserler",
            label: "Eserleri keşfet",
            description: "İlkOku'da herkese açık olarak yayımlanmış eserleri inceleyin.",
          },
          {
            href: "/yazarlar",
            label: "Yazarları keşfet",
            description: "Public yazar vitrinlerinden yayımlanmış eserlere ulaşın.",
          },
          {
            href: "/editorler",
            label: "Editörleri incele",
            description: "Doğrulanmış ve public görünürlüğe açık editör profillerini görün.",
          },
          {
            href: "/yardim",
            label: "Yardım Merkezi",
            description: "Hesap ve kullanım sorularınız için mevcut destek içeriklerine ulaşın.",
          },
        ]}
      />
    </>
  );
}
