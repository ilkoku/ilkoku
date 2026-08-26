import type { Metadata } from "next";
import { cache } from "react";

import { ContentAgePolicyExperience } from "@/components/content/ContentAgePolicyExperience";
import { PublicTrustFooter } from "@/components/content/PublicTrustFooter";
import { contentAgePolicyPageContent } from "@/content/content-age-policy";
import { getPublicTrustPageVisual } from "@/content/public-trust-page-visuals";
import { getPublishedCmsPublicPageState } from "@/lib/cms-public-page-store";

import "@/app/nasil-calisir/how-it-works.css";
import "@/app/nasil-calisir/public-trust-footer.css";
import "./content-age-policy.css";

const baseUrl = "https://ilkoku.com";
const visual = getPublicTrustPageVisual("/icerik-ve-yas-politikasi");
const socialImage = `${baseUrl}${visual.src}`;

export const dynamic = "force-dynamic";

const resolvePage = cache(async () => {
  const state = await getPublishedCmsPublicPageState("icerik-ve-yas-politikasi");
  if (state.state === "valid") {
    return {
      body: state.page.body,
      canonical: state.page.canonicalUrl || contentAgePolicyPageContent.canonical,
      noIndex: state.page.noIndex,
      seoDescription: state.page.seoDescription || state.page.summary || contentAgePolicyPageContent.seoDescription,
      seoTitle: state.page.seoTitle || state.page.title,
      summary: state.page.summary || contentAgePolicyPageContent.summary,
      title: state.page.title,
      updatedAt: state.page.updatedAt,
    };
  }
  return { ...contentAgePolicyPageContent, noIndex: false, updatedAt: new Date(contentAgePolicyPageContent.updatedAt) };
});

export async function generateMetadata(): Promise<Metadata> {
  const page = await resolvePage();
  return {
    title: page.seoTitle,
    description: page.seoDescription,
    alternates: { canonical: page.canonical },
    robots: page.noIndex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { title: page.seoTitle, description: page.seoDescription, type: "website", locale: "tr_TR", url: page.canonical, images: [{ url: socialImage, alt: visual.alt }] },
    twitter: { card: "summary_large_image", title: page.seoTitle, description: page.seoDescription, images: [socialImage] },
  };
}

export default async function ContentAgePolicyPage() {
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
      primaryImageOfPage: { "@type": "ImageObject", url: socialImage },
      isPartOf: { "@type": "WebSite", name: "İlkOku", url: baseUrl },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: `${baseUrl}/` },
        { "@type": "ListItem", position: 2, name: page.title, item: absoluteUrl },
      ],
    },
  ];
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} /><ContentAgePolicyExperience title={page.title} summary={page.summary} body={page.body} updatedAt={page.updatedAt} /><PublicTrustFooter /></>;
}
