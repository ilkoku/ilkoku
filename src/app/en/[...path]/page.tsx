import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicEditorialDocument } from "@/components/content/PublicEditorialDocument";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { parseCmsPageBody } from "@/lib/cms-pages";
import { prisma } from "@/lib/prisma";

type PublicPageRow = {
  contentKey: string;
  slug: string;
  title: string;
  bodyJson: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  updatedAt: Date;
};

type PageProps = { params: Promise<{ path: string[] }> };

export const dynamic = "force-dynamic";

function sourceFromPath(path: string[]) {
  return `/en/${path.join("/")}`.replace(/\/{2,}/g, "/");
}

function absoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://ilkoku.com${value.startsWith("/") ? value : `/${value}`}`;
}

async function loadPublicPage(source: string) {
  try {
    const rows = await prisma.$queryRaw<PublicPageRow[]>`
      SELECT contentKey, slug, title, bodyJson, seoTitle, seoDescription, canonicalUrl, noIndex, updatedAt
      FROM ContentPage
      WHERE slug = ${source}
        AND contentKey LIKE 'page:en:%'
        AND status = 'published'
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function loadTurkishAlternate(contentKey: string) {
  if (!contentKey.startsWith("page:en:")) return null;
  const trKey = `page:tr:${contentKey.slice("page:en:".length)}`;
  try {
    const rows = await prisma.$queryRaw<Array<{ slug: string; canonicalUrl: string | null }>>`
      SELECT slug, canonicalUrl
      FROM ContentPage
      WHERE contentKey = ${trKey}
        AND status = 'published'
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!(await isCmsLocaleEnabled("en"))) return {};
  const { path } = await params;
  const source = sourceFromPath(path);
  const page = await loadPublicPage(source);
  if (!page) return {};
  const body = parseCmsPageBody(page.bodyJson);
  const description = page.seoDescription || body.summary || undefined;
  const canonical = absoluteUrl(page.canonicalUrl || page.slug);
  const turkish = await loadTurkishAlternate(page.contentKey);
  const trUrl = turkish ? absoluteUrl(turkish.canonicalUrl || turkish.slug) : null;

  return {
    title: page.seoTitle || page.title,
    description,
    alternates: {
      canonical,
      languages: {
        en: canonical,
        ...(trUrl ? { "tr-TR": trUrl } : {}),
        "x-default": trUrl || canonical,
      },
    },
    robots: page.noIndex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: page.seoTitle || page.title,
      description,
      type: "website",
      locale: "en_US",
      url: canonical,
    },
  };
}

export default async function EnglishCmsPage({ params }: PageProps) {
  if (!(await isCmsLocaleEnabled("en"))) notFound();
  const { path } = await params;
  const source = sourceFromPath(path);
  const page = await loadPublicPage(source);
  if (!page) notFound();
  const content = parseCmsPageBody(page.bodyJson);

  return (
    <PublicEditorialDocument
      eyebrow="İlkOku"
      title={page.title}
      summary={content.summary}
      body={content.body}
      backHref="/en"
      backLabel="English home"
      updatedAt={page.updatedAt}
    />
  );
}
