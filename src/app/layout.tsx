import type { Metadata } from "next";
import Script from "next/script";
import { PublicAnnouncementBanner } from "@/components/content/PublicAnnouncementBanner";
import { PublicCmsHydrator } from "@/components/content/PublicCmsHydrator";
import { PublicNavigationHistory } from "@/components/layout/PublicNavigationHistory";
import { SiteAnalyticsLoader } from "@/components/privacy/SiteAnalyticsLoader";
import { SiteConsentBanner } from "@/components/privacy/SiteConsentBanner";
import {
  publicBrandDescription,
  publicBrandName,
  publicBrandPositioning,
  publicBrandSocialImage,
  publicBrandTitle,
} from "@/lib/public-brand";
import { siteContact, siteSocialUrls } from "@/lib/site-contact";
import "./globals.css";
import "./landing-theme.css";
import "./landing-role-icons.css";
import "./landing-footer-pro.css";
import "./landing-footer-tight.css";
import "./landing-header-pro.css";
import "./landing-account-bubble.css";
import "./site-contact-links.css";

const baseUrl = "https://ilkoku.com";
const officialEntityUrls = [...siteSocialUrls, "https://github.com/ilkoku"];

const analyticsHeadBootstrap = `
(() => {
  const scriptId = "ilkoku-gtm-script";
  const consentKey = "ilkoku:consent:v1";

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500
  });

  function storedAnalyticsConsent() {
    try {
      const raw = window.localStorage.getItem(consentKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(
        parsed &&
        parsed.version === 1 &&
        parsed.analytics === true &&
        typeof parsed.expiresAt === "number" &&
        parsed.expiresAt > Date.now()
      );
    } catch {
      return false;
    }
  }

  fetch("/api/site-analytics", { cache: "no-store", credentials: "same-origin" })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (payload) {
      const settings = payload && payload.settings;
      if (!settings || !settings.enabled) return;

      const granted = settings.consentRequired ? storedAnalyticsConsent() : true;
      window.gtag("consent", "update", {
        analytics_storage: granted ? "granted" : "denied"
      });

      if (!settings.gtmEnabled || !settings.gtmId || document.getElementById(scriptId)) return;

      window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      const script = document.createElement("script");
      script.id = scriptId;
      script.async = true;
      script.dataset.analyticsState = "loading";
      script.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(settings.gtmId);
      script.onload = function () { script.dataset.analyticsState = "loaded"; };
      script.onerror = function () { script.dataset.analyticsState = "error"; };
      document.head.appendChild(script);
    })
    .catch(function () {});
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: publicBrandTitle,
  description: publicBrandDescription,
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: publicBrandName,
    title: publicBrandTitle,
    description: publicBrandDescription,
    images: [{ url: publicBrandSocialImage, alt: publicBrandTitle }],
  },
  twitter: {
    card: "summary_large_image",
    title: publicBrandTitle,
    description: publicBrandDescription,
    images: [publicBrandSocialImage],
  },
  icons: {
    icon: [
      { url: "/icons/ilkoku-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/ilkoku-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/ilkoku-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/ilkoku-180.png", sizes: "180x180", type: "image/png" }],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${baseUrl}/#organization`,
  name: publicBrandName,
  alternateName: publicBrandPositioning,
  url: baseUrl,
  email: siteContact.generalEmail,
  sameAs: officialEntityUrls,
  logo: {
    "@type": "ImageObject",
    url: `${baseUrl}/icons/ilkoku-512.png`,
    width: 512,
    height: 512,
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "general inquiries",
      email: siteContact.generalEmail,
      availableLanguage: ["Turkish"],
    },
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: siteContact.supportEmail,
      availableLanguage: ["Turkish"],
    },
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${baseUrl}/#website`,
  name: publicBrandName,
  alternateName: publicBrandPositioning,
  url: baseUrl,
  inLanguage: "tr-TR",
  description: publicBrandDescription,
  publisher: {
    "@id": `${baseUrl}/#organization`,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" data-scroll-behavior="smooth">
      <body>
        <Script
          id="ilkoku-gtm-early-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: analyticsHeadBootstrap }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c") }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema).replace(/</g, "\\u003c") }}
        />
        <PublicNavigationHistory />
        <PublicAnnouncementBanner />
        {children}
        <PublicCmsHydrator />
        <SiteAnalyticsLoader />
        <SiteConsentBanner />
      </body>
    </html>
  );
}
