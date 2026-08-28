import type { Metadata } from "next";
import { PublicAnnouncementBanner } from "@/components/content/PublicAnnouncementBanner";
import { PublicCmsHydrator } from "@/components/content/PublicCmsHydrator";
import { PublicNavigationHistory } from "@/components/layout/PublicNavigationHistory";
import { tr } from "@/content";
import "./globals.css";
import "./landing-theme.css";
import "./landing-role-icons.css";
import "./landing-footer-pro.css";
import "./landing-footer-tight.css";
import "./landing-header-pro.css";
import "./landing-account-bubble.css";

const baseUrl = "https://ilkoku.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: tr.brand.name,
  description: tr.brand.tagline,
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: tr.brand.name,
    title: tr.brand.name,
    description: tr.brand.tagline,
  },
  twitter: {
    card: "summary_large_image",
    title: tr.brand.name,
    description: tr.brand.tagline,
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
  name: tr.brand.name,
  url: baseUrl,
  logo: {
    "@type": "ImageObject",
    url: `${baseUrl}/icons/ilkoku-512.png`,
    width: 512,
    height: 512,
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${baseUrl}/#website`,
  name: tr.brand.name,
  url: baseUrl,
  inLanguage: "tr-TR",
  description: tr.brand.tagline,
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
