import { createHash } from "node:crypto";

import type { MetadataRoute } from "next";

import { buildSitemap } from "@/lib/seo/sitemap-data";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizeLastModified(value: Date | string | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serializeSitemap(entries: MetadataRoute.Sitemap) {
  const urls = entries.map((entry) => {
    const lastModified = normalizeLastModified(entry.lastModified);
    return [
      "  <url>",
      `    <loc>${escapeXml(entry.url)}</loc>`,
      ...(lastModified ? [`    <lastmod>${lastModified.toISOString()}</lastmod>`] : []),
      ...(entry.changeFrequency ? [`    <changefreq>${entry.changeFrequency}</changefreq>`] : []),
      ...(typeof entry.priority === "number" ? [`    <priority>${entry.priority}</priority>`] : []),
      "  </url>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

function normalizeEntityTag(value: string) {
  return value.trim().replace(/^W\//i, "");
}

function ifNoneMatchMatches(ifNoneMatch: string | null, etag: string) {
  if (!ifNoneMatch) return false;
  const normalizedEtag = normalizeEntityTag(etag);
  return ifNoneMatch.split(",").some((candidate) => {
    const value = candidate.trim();
    return value === "*" || normalizeEntityTag(value) === normalizedEtag;
  });
}

export async function GET(request: Request) {
  const entries = await buildSitemap();
  const xml = serializeSitemap(entries);
  const etag = `"${createHash("sha256").update(xml).digest("base64url")}"`;
  // Sitemap membership can change without changing the latest page <lastmod>.
  // Only the hash of the complete XML is a sound whole-document validator.
  const headers: Record<string, string> = {
    "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
    "Content-Type": "application/xml; charset=utf-8",
    ETag: etag,
  };

  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatchMatches(ifNoneMatch, etag)) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(xml, { headers });
}
