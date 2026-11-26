import type { Metadata } from "next";

import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import {
  publicBrandDescription,
  publicBrandSocialImage,
  publicBrandTitle,
} from "@/lib/public-brand";

import HomepageExperience from "@/features/homepage/HomepageExperience";

import "./landing-theme.css";
import "./landing-role-icons.css";
import "./landing-header-pro.css";
import "./landing-account-bubble.css";
import "@/features/homepage/history-pr670.css";
import "@/features/homepage/roles-light.css";
import "@/features/homepage/passport-dark.css";
import "@/features/homepage/passport-dark-priority.css";
import "@/features/homepage/why-uniform.css";
import "./home-apple-soft.css";

const homeTitle = publicBrandTitle;
const homeDescription = publicBrandDescription;
const homeSocialImage = publicBrandSocialImage;

export async function generateMetadata(): Promise<Metadata> {
  const englishEnabled = await isCmsLocaleEnabled("en");

  return {
    title: homeTitle,
    description: homeDescription,
    keywords: ["dijital yazar platformu", "digital yazar platformu"],
    alternates: {
      canonical: "https://ilkoku.com/",
      languages: {
        "tr-TR": "https://ilkoku.com/",
        ...(englishEnabled ? { en: "https://ilkoku.com/en" } : {}),
        "x-default": "https://ilkoku.com/",
      },
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: homeTitle,
      description: homeDescription,
      type: "website",
      locale: "tr_TR",
      url: "https://ilkoku.com/",
      images: [{ url: homeSocialImage, alt: publicBrandTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: homeTitle,
      description: homeDescription,
      images: [homeSocialImage],
    },
  };
}

const homepageSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://ilkoku.com/#webpage",
      url: "https://ilkoku.com/",
      name: homeTitle,
      description: homeDescription,
      inLanguage: "tr-TR",
      isPartOf: { "@id": "https://ilkoku.com/#website" },
      about: { "@id": "https://ilkoku.com/#organization" },
      mainEntity: { "@id": "https://ilkoku.com/#platform-service" },
    },
    {
      "@type": "Service",
      "@id": "https://ilkoku.com/#platform-service",
      name: "İlkOku Dijital Yazar Platformu",
      serviceType: "Dijital yazarlık ve editoryal değerlendirme platformu",
      description: homeDescription,
      url: "https://ilkoku.com/",
      provider: { "@id": "https://ilkoku.com/#organization" },
    },
  ],
};

export const revalidate = 300;

export default function HomePage() {
  return (
    <div className="homepage-live">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageSchema).replace(/</g, "\\u003c") }}
      />
      <PublicSiteHeader />
      <HomepageExperience />
    </div>
  );
}
