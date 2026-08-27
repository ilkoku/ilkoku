import type { Metadata } from "next";
import { cache } from "react";

import { AboutExperience } from "@/components/content/AboutExperience";
import { PublicTrustFooter } from "@/components/content/PublicTrustFooter";
import { aboutPageContent } from "@/content/about";
import { getPublishedCmsPublicPageState } from "@/lib/cms-public-page-store";
import "./about.css";
import "../nasil-calisir/public-trust-footer.css";

const baseUrl = "https://ilkoku.com";
const socialImage = `${baseUrl}/opengraph-image`;
const requiredHeadings = [
  "## Neden İlkOku var?",
  "## Dört rol, tek eser yolculuğu",
  "## Bir eseri yalnızca son hâliyle görmüyoruz",
  "## Güvenin temeli: herkesin rolü belli",
  "## İlkOku ne değildir?",
  "## Nereye gidiyoruz?",
] as const;

export const dynamic = "force-dynamic";

function hasAboutExperienceStructure(body: string) {
  return requiredHeadings.every((heading) => body.includes(heading));
}

const resolvePage = cache(async () => {
  const state = await getPublishedCmsPublicPageState("hakkimizda");

  if (state.state === "valid" && hasAboutExperienceStructure(state.page.body)) {
    return {
      body: state.page.body,
      canonical: state.page.canonicalUrl || aboutPageContent.canonical,
      noIndex: state.page.noIndex,
      seoDescription: state.page.seoDescription || state.page.summary || aboutPageContent.seoDescription,
      seoTitle: state.page.seoTitle || state.page.title,
      summary: state.page.summary || aboutPageContent.summary,
      title: state.page.title,
      updatedAt: state.page.updatedAt,
    };
  }

  return {
    body: aboutPageContent.body,
    canonical:
      state.state === "valid" && state.page.canonicalUrl
        ? state.page.canonicalUrl
        : aboutPageContent.canonical,
    noIndex: state.state === "valid" ? state.page.noIndex : false,
    seoDescription: aboutPageContent.seoDescription,
    seoTitle: aboutPageContent.seoTitle,
    summary: aboutPageContent.summary,
    title: aboutPageContent.title,
    updatedAt: new Date(aboutPageContent.updatedAt),
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
      images: [{ url: socialImage, alt: "İlkOku dijital edebiyat ekosistemi" }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.seoTitle,
      description: page.seoDescription,
      images: [socialImage],
    },
  };
}

export default async function AboutPage() {
  const page = await resolvePage();
  const absoluteUrl = new URL(page.canonical, baseUrl).toString();
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
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
      mainEntity: {
        "@type": "Organization",
        name: "İlkOku",
        url: baseUrl,
        description: page.summary,
      },
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <AboutExperience
        title={page.title}
        summary={page.summary}
        body={page.body}
        updatedAt={page.updatedAt}
      />
      <PublicTrustFooter />
    </>
  );
}
