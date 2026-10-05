import type { Metadata } from "next";

import { isSoftLaunchSearchExcludedPath } from "@/lib/soft-launch-search-policy";

const publicSiteUrl = "https://ilkoku.com";
const defaultSocialImage = `${publicSiteUrl}/og/ilkoku-social-selected-2026.webp`;

type PublicPageMetadataInput = {
  title: string;
  description?: string | null;
  canonical: string;
  noIndex?: boolean;
  image?: string | null;
  languages?: Record<string, string> | null;
};

function absolutePublicUrl(value: string) {
  if (/^https:\/\//i.test(value)) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${publicSiteUrl}${path}`;
}

export function createPublicPageMetadata({
  title,
  description,
  canonical,
  noIndex = false,
  image,
  languages,
}: PublicPageMetadataInput): Metadata {
  const canonicalUrl = absolutePublicUrl(canonical);
  const socialImage = image ? absolutePublicUrl(image) : defaultSocialImage;
  const safeDescription = description || undefined;
  const effectiveNoIndex = noIndex || isSoftLaunchSearchExcludedPath(canonical);
  const languageAlternates = languages
    ? Object.fromEntries(
        Object.entries(languages).map(([locale, href]) => [locale, absolutePublicUrl(href)]),
      )
    : undefined;

  return {
    title,
    description: safeDescription,
    alternates: {
      canonical: canonicalUrl,
      ...(languageAlternates ? { languages: languageAlternates } : {}),
    },
    robots: effectiveNoIndex
      ? {
          index: false,
          follow: true,
          googleBot: {
            index: false,
            follow: true,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    openGraph: {
      title,
      description: safeDescription,
      type: "website",
      locale: "tr_TR",
      siteName: "İlkOku",
      url: canonicalUrl,
      images: [{ url: socialImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: safeDescription,
      images: [socialImage],
    },
  };
}
