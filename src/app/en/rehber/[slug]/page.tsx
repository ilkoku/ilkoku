import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicEditorialDocument } from "@/components/content/PublicEditorialDocument";
import { getPublishedGuideBySlug, parseGuideBody } from "@/lib/cms-guides";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

function absoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://ilkoku.com${value.startsWith("/") ? value : `/${value}`}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!(await isCmsLocaleEnabled("en"))) return {};
  const { slug } = await params;
  const [guide, turkish] = await Promise.all([
    getPublishedGuideBySlug(slug, "en"),
    getPublishedGuideBySlug(slug, "tr"),
  ]);
  if (!guide) return {};
  const stored = parseGuideBody(guide.bodyJson);
  const description = guide.seoDescription || stored.summary || undefined;
  const canonical = absoluteUrl(guide.canonicalUrl || guide.slug);

  return {
    title: guide.seoTitle || `${guide.title} | İlkOku`,
    description,
    alternates: {
      canonical,
      languages: {
        en: canonical,
        ...(turkish ? { "tr-TR": absoluteUrl(turkish.canonicalUrl || turkish.slug) } : {}),
        "x-default": turkish ? absoluteUrl(turkish.canonicalUrl || turkish.slug) : canonical,
      },
    },
    robots: guide.noIndex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: guide.seoTitle || guide.title,
      description,
      type: "article",
      locale: "en_US",
      url: canonical,
    },
  };
}

export default async function EnglishGuideDetailPage({ params }: PageProps) {
  if (!(await isCmsLocaleEnabled("en"))) notFound();
  const { slug } = await params;
  const guide = await getPublishedGuideBySlug(slug, "en");
  if (!guide) notFound();
  const stored = parseGuideBody(guide.bodyJson);

  return (
    <PublicEditorialDocument
      eyebrow="İlkOku Guide"
      title={guide.title}
      summary={stored.summary}
      body={stored.body ?? ""}
      backHref="/en"
      backLabel="English home"
      updatedAt={guide.updatedAt}
    />
  );
}
