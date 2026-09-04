import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { PublicEditorialDocument } from "@/components/content/PublicEditorialDocument";
import { PublicPageTemplate } from "@/components/layout/PublicPageTemplate";
import { parseCmsPageBody } from "@/lib/cms-pages";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";
import { normalizeCmsRedirectPath, parseCmsRedirectValue } from "@/lib/cms-redirects";
import { prisma } from "@/lib/prisma";

type RedirectRow = { valueJson: string };
type PublicPageRow = {
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
  return `/${path.join("/")}`.replace(/\/{2,}/g, "/");
}

async function loadPublicPage(source: string) {
  if (source.split("/").filter(Boolean).length !== 1) return null;
  try {
    const rows = await prisma.$queryRaw<PublicPageRow[]>`
      SELECT slug, title, bodyJson, seoTitle, seoDescription, canonicalUrl, noIndex, updatedAt
      FROM ContentPage
      WHERE slug = ${source}
        AND contentKey LIKE 'page:tr:%'
        AND status = 'published'
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { path } = await params;
  const source = sourceFromPath(path);
  const page = await loadPublicPage(source);
  if (!page) return {};
  const body = parseCmsPageBody(page.bodyJson);

  return createPublicPageMetadata({
    title: page.seoTitle || page.title,
    description: page.seoDescription || body.summary,
    canonical: page.canonicalUrl || page.slug,
    noIndex: page.noIndex,
  });
}

export default async function CmsPageOrRedirectFallback({ params }: PageProps) {
  const { path } = await params;
  const source = sourceFromPath(path);
  const page = await loadPublicPage(source);

  if (page) {
    const content = parseCmsPageBody(page.bodyJson);
    return (
      <PublicPageTemplate>
        <PublicEditorialDocument
          eyebrow="İlkOku"
          title={page.title}
          summary={content.summary}
          body={content.body}
          backHref="/"
          backLabel="Ana sayfa"
          updatedAt={page.updatedAt}
        />
      </PublicPageTemplate>
    );
  }

  let normalizedSource = "";
  try {
    normalizedSource = normalizeCmsRedirectPath(source, "source");
  } catch {
    notFound();
  }

  let rows: RedirectRow[] = [];
  try {
    rows = await prisma.$queryRaw<RedirectRow[]>`
      SELECT valueJson
      FROM SiteContent
      WHERE namespace = 'redirect'
        AND contentKey = ${normalizedSource}
        AND status = 'published'
      LIMIT 1
    `;
  } catch {
    notFound();
  }

  const value = rows[0] ? parseCmsRedirectValue(rows[0].valueJson) : null;
  if (!value || value.source !== normalizedSource) notFound();
  permanentRedirect(value.target);
}
