import type { Metadata } from "next";

import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import {
  publicBrandDescription,
  publicBrandSocialImage,
  publicBrandTitle,
} from "@/lib/public-brand";

import HomepageExperience from "@/features/homepage/HomepageExperience";

import "./landing.css";
import "@/features/homepage/history-pr670.css";
import "@/features/homepage/roles-light.css";
import "@/features/homepage/passport-dark.css";
import "@/features/homepage/passport-dark-priority.css";
import "@/features/homepage/why-uniform.css";
import "@/features/homepage/header-encyclopedia.css";
import "@/features/homepage/header-terminal-spine.css";
import "@/features/homepage/header-login-terminal.css";
import "./home-live.css";
import "./home-apple-soft.css";

const homeTitle = publicBrandTitle;
const homeDescription = publicBrandDescription;
const homeSocialImage = publicBrandSocialImage;

export async function generateMetadata(): Promise<Metadata> {
  const englishEnabled = await isCmsLocaleEnabled("en");

  return {
    title: homeTitle,
    description: homeDescription,
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

export const revalidate = 300;

export default function HomePage() {
  return (
    <div className="homepage-live">
      <PublicSiteHeader />
      <HomepageExperience />
    </div>
  );
}
