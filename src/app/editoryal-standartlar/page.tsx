import type { Metadata } from "next";
import { cache } from "react";

import { EditorialStandardsExperience } from "@/components/content/EditorialStandardsExperience";
import { editorialStandardsPageContent } from "@/content/editorial-standards";
import { getPublicTrustPageVisual } from "@/content/public-trust-page-visuals";
import { getPublishedCmsPublicPageState } from "@/lib/cms-public-page-store";

import "@/app/nasil-calisir/how-it-works.css";
import "./editorial-standards.css";

const baseUrl = "https://ilkoku.com";
const visual = getPublicTrustPageVisual("/editoryal-standartlar");
const socialImage = `${baseUrl}${visual.src}`;

export const dynamic = "force-dynamic";

const resolvePage = cache(async () => {
  const state = await getPublishedCmsPublicPageState("editoryal-standartlar");

  if (state.state === "valid") {
    return {
      body: state.page.body,
      canonical: state.page.canonicalUrl || editorialStandardsPageContent.canonical,
      noIndex: state.page.noIndex,
      seoDescription: state.page.seoDescription || state.page.summary || editorialStandardsPageContent.seoDescription,
      seoTitle: state.page.seoTitle || state.page.title,
      summary: state.page.summary || editorialStandardsPageContent.summary,
      title: state.page.title,
      updatedAt: state.page.updatedAt,
    };
  }

  return {
    body: editorialStandardsPageContent.body,
    canonical: editorialStandardsPageContent.canonical,
    noIndex: false,
    seoDescription: editorialStandardsPageContent.seoDescription,
    seoTitle: editorialStandardsPageContent.seoTitle,
    summary: editorialStandardsPageContent.summary,
    title: editorialStandardsPageContent.title,
    updatedAt: new Date(editorialStandardsPageContent.updatedAt),
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
      images: [{ url: socialImage, alt: visual.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.seoTitle,
      description: page.seoDescription,
      images: [socialImage],
    },
  };
}

export default async function EditorialStandardsPage() {
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
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: socialImage,
      },
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
      <EditorialStandardsExperience
        title={page.title}
        summary={page.summary}
        body={page.body}
        updatedAt={page.updatedAt}
      />
    </>
  );
}
