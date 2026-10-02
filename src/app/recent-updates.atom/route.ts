import { createHash } from "node:crypto";
import { GENRES } from "@/lib/genres";
import { prisma } from "@/lib/prisma";
import { WRITING_GUIDE_STRUCTURED_DATA_UPDATED_AT } from "@/lib/search-content-freshness";
import { WRITING_CATEGORY_HUBS } from "@/lib/writing-category-hubs";

const baseUrl = "https://ilkoku.com";
const feedUrl = `${baseUrl}/recent-updates.atom`;
const hubUrl = "https://pubsubhubbub.appspot.com/";
const RECENT_ENTRY_LIMIT = 20;

type WritingGuideFreshnessRow = {
  contentKey: string;
  updatedAt: Date;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const categoryHrefByCategory = new Map(
  WRITING_CATEGORY_HUBS.map((hub) => [hub.category, hub.href] as const),
);

async function loadPublishedWritingGuideFreshness() {
  try {
    const rows = await prisma.$queryRaw<WritingGuideFreshnessRow[]>`
      SELECT contentKey, updatedAt
      FROM SiteContent
      WHERE namespace = 'education_guide'
        AND status = 'published'
      ORDER BY updatedAt DESC
      LIMIT 1000
    `;

    return new Map(rows.map((row) => [row.contentKey, row.updatedAt] as const));
  } catch {
    return new Map<string, Date>();
  }
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const freshnessBySlug = await loadPublishedWritingGuideFreshness();
  const recentGuides = GENRES.map((genre) => ({
    genre,
    updatedAt:
      freshnessBySlug.get(genre.slug) ??
      WRITING_GUIDE_STRUCTURED_DATA_UPDATED_AT,
  }))
    .sort((a, b) => {
      const byFreshness = b.updatedAt.getTime() - a.updatedAt.getTime();
      if (byFreshness !== 0) return byFreshness;
      return a.genre.slug.localeCompare(b.genre.slug, "tr");
    })
    .slice(0, RECENT_ENTRY_LIMIT);

  const feedUpdated =
    recentGuides[0]?.updatedAt ?? WRITING_GUIDE_STRUCTURED_DATA_UPDATED_AT;

  const entries = recentGuides.map(({ genre, updatedAt }) => {
    const categoryHref = categoryHrefByCategory.get(genre.category);
    if (!categoryHref) {
      throw new Error(`Missing writing category hub for ${genre.category}`);
    }

    const url = `${baseUrl}${categoryHref}/${genre.slug}`;
    return [
      "  <entry>",
      `    <id>${url}</id>`,
      `    <title>${escapeXml(`${genre.label} Yazarlık Rehberi | İlkOku`)}</title>`,
      `    <link href="${url}" />`,
      `    <updated>${updatedAt.toISOString()}</updated>`,
      `    <category term="${escapeXml(genre.category)}" />`,
      `    <summary>${escapeXml(`İlkOku ${genre.label} yazarlık rehberi.`)}</summary>`,
      "  </entry>",
    ].join("\n");
  }).join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    "  <title>İlkOku — Son Arama Güncellemeleri</title>",
    `  <id>${feedUrl}</id>`,
    `  <link rel="self" href="${feedUrl}" type="application/atom+xml" />`,
    `  <link rel="hub" href="${hubUrl}" />`,
    `  <updated>${feedUpdated.toISOString()}</updated>`,
    "  <author><name>İlkOku</name></author>",
    entries,
    "</feed>",
    "",
  ].join("\n");

  const etag = `"${createHash("sha256").update(xml).digest("base64url")}"`;
  const headers = {
    "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
    "Content-Type": "application/atom+xml; charset=utf-8",
    ETag: etag,
    "Last-Modified": feedUpdated.toUTCString(),
    Link: `<${hubUrl}>; rel="hub", <${feedUrl}>; rel="self"`,
  };

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }

  const ifModifiedSince = request.headers.get("if-modified-since");
  if (ifModifiedSince) {
    const validatorTime = Date.parse(ifModifiedSince);
    if (Number.isFinite(validatorTime) && validatorTime >= feedUpdated.getTime()) {
      return new Response(null, { status: 304, headers });
    }
  }

  return new Response(xml, { headers });
}
