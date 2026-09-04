import type { Metadata } from "next";

const publicSiteUrl = "https://ilkoku.com";
const defaultSocialImage = `${publicSiteUrl}/opengraph-image`;

type PublicPageMetadataInput = {
  title: string;
  description?: string | null;
  canonical: string;
  noIndex?: boolean;
  image?: string | null;
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
}: PublicPageMetadataInput): Metadata {
  const canonicalUrl = absolutePublicUrl(canonical);
  const socialImage = image ? absolutePublicUrl(image) : defaultSocialImage;
  const safeDescription = description || undefined;

  return {
    title,
    description: safeDescription,
    alternates: { canonical: canonicalUrl },
    robots: noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true },
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
