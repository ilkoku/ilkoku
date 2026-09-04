import type { Metadata } from "next";
import { PublicAnnouncementBanner } from "@/components/content/PublicAnnouncementBanner";
import { PublicCmsHydrator } from "@/components/content/PublicCmsHydrator";
import { PublicNavigationHistory } from "@/components/layout/PublicNavigationHistory";
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
  sameAs: siteSocialUrls,
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
      </body>
    </html>
  );
}
