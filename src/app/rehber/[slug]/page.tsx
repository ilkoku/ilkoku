import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicEditorialDocument } from "@/components/content/PublicEditorialDocument";
import {
  getFoundationalGuide,
} from "@/content/public-guides";
import {
  getPublishedGuideBySlug,
  parseGuideBody,
} from "@/lib/cms-guides";

const baseUrl = "https://ilkoku.com";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

async function getPublicGuide(slug: string) {
  const cmsGuide = await getPublishedGuideBySlug(slug);

  if (cmsGuide) {
    const stored = parseGuideBody(cmsGuide.bodyJson);

    return {
      body: stored.body ?? "",
      canonical:
        cmsGuide.canonicalUrl || cmsGuide.slug,
      description:
        cmsGuide.seoDescription ||
        stored.summary ||
        undefined,
      noIndex: cmsGuide.noIndex,
      publishedAt: cmsGuide.publishedAt,
      slug: cmsGuide.slug,
      summary: stored.summary,
      title: cmsGuide.title,
      seoTitle:
        cmsGuide.seoTitle ||
        `${cmsGuide.title} | İlkOku`,
      updatedAt: cmsGuide.updatedAt,
    };
  }

  const guide = getFoundationalGuide(slug);

  if (!guide) {
    return null;
  }

  return {
    body: guide.body,
    canonical: `/rehber/${guide.slug}`,
    description: guide.description,
    noIndex: false,
    publishedAt: new Date(guide.updatedAt),
    slug: `/rehber/${guide.slug}`,
    summary: guide.summary,
    title: guide.title,
    seoTitle: `${guide.title} | İlkOku`,
    updatedAt: new Date(guide.updatedAt),
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getPublicGuide(slug);

  if (!guide) {
    return {
      title: "Rehber bulunamadı | İlkOku",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: guide.seoTitle,
    description: guide.description,
    alternates: {
      canonical: guide.canonical,
    },
    robots: guide.noIndex
      ? {
          index: false,
          follow: true,
        }
      : {
          index: true,
          follow: true,
        },
    openGraph: {
      title: guide.seoTitle,
      description: guide.description,
      type: "article",
      url: guide.canonical,
      publishedTime:
        guide.publishedAt?.toISOString(),
      modifiedTime: guide.updatedAt.toISOString(),
    },
  };
}

export default async function GuideDetailPage({
  params,
}: PageProps) {
  const { slug } = await params;
  const guide = await getPublicGuide(slug);

  if (!guide) {
    notFound();
  }

  const absoluteUrl = new URL(
    guide.canonical,
    baseUrl,
  ).toString();
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    datePublished:
      guide.publishedAt?.toISOString(),
    dateModified: guide.updatedAt.toISOString(),
    inLanguage: "tr-TR",
    mainEntityOfPage: absoluteUrl,
    author: {
      "@type": "Organization",
      name: "İlkOku",
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "İlkOku",
      url: baseUrl,
    },
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana Sayfa",
        item: `${baseUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Rehberler",
        item: `${baseUrl}/rehber`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: guide.title,
        item: absoluteUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            articleSchema,
            breadcrumbSchema,
          ]).replace(/</g, "\\u003c"),
        }}
      />
      <PublicEditorialDocument
        eyebrow="İlkOku Rehber"
        title={guide.title}
        summary={guide.summary}
        body={guide.body}
        backHref="/rehber"
        backLabel="Tüm rehberler"
        updatedAt={guide.updatedAt}
      />
    </>
  );
}
