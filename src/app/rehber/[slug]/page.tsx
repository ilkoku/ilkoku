import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicEditorialDocument } from "@/components/content/PublicEditorialDocument";
import { getPublishedGuideBySlug, parseGuideBody } from "@/lib/cms-guides";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getPublishedGuideBySlug(slug);
  if (!guide) return {};
  const stored = parseGuideBody(guide.bodyJson);
  const description = guide.seoDescription || stored.summary || undefined;

  return {
    title: guide.seoTitle || `${guide.title} | İlkOku`,
    description,
    alternates: { canonical: guide.canonicalUrl || guide.slug },
    robots: guide.noIndex ? { index: false, follow: true } : undefined,
    openGraph: { title: guide.seoTitle || guide.title, description, type: "article" },
  };
}

export default async function GuideDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const guide = await getPublishedGuideBySlug(slug);
  if (!guide) notFound();
  const stored = parseGuideBody(guide.bodyJson);

  return (
    <PublicEditorialDocument
      eyebrow="İlkOku Rehber"
      title={guide.title}
      summary={stored.summary}
      body={stored.body ?? ""}
      backHref="/rehber"
      backLabel="Tüm rehberler"
      updatedAt={guide.updatedAt}
    />
  );
}
