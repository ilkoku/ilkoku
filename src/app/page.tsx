import type { Metadata } from "next";

import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";

import HomepageRedesignWorkspacePage from "./onizleme/ana-sayfa-yeni/page";

import "./landing.css";
import "./onizleme/ana-sayfa-yeni/history-pr670.css";
import "./onizleme/ana-sayfa-yeni/roles-light.css";
import "./onizleme/ana-sayfa-yeni/passport-dark.css";
import "./onizleme/ana-sayfa-yeni/passport-dark-priority.css";
import "./onizleme/ana-sayfa-yeni/why-uniform.css";
import "./onizleme/ana-sayfa-yeni/header-encyclopedia.css";
import "./onizleme/ana-sayfa-yeni/header-terminal-spine.css";
import "./onizleme/ana-sayfa-yeni/header-login-terminal.css";
import "./home-live.css";

const homeTitle = "İlkOku | İlk cümle, ilk okurun, ilk adımın.";
const homeDescription = "Yazarları, okuyucuları, editörleri ve yayınevlerini aynı platformda buluşturan dijital edebiyat ekosistemi.";
const homeSocialImage = "/landing/ilkoku-hero.webp";

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
      images: [{ url: homeSocialImage, alt: "İlkOku dijital edebiyat platformu" }],
    },
    twitter: {
      card: "summary_large_image",
      title: homeTitle,
      description: homeDescription,
      images: [homeSocialImage],
    },
  };
}

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="homepage-live">
      <PublicSiteHeader />
      <HomepageRedesignWorkspacePage />
    </div>
  );
}
