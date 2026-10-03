import { createHash } from "node:crypto";

import { WRITING_GUIDE_STRUCTURED_DATA_UPDATED_AT } from "@/lib/search-content-freshness";
import { buildSitemap } from "@/lib/seo/sitemap-data";

const baseUrl = "https://ilkoku.com";
const feedUrl = `${baseUrl}/recent-updates.atom`;
const hubUrl = "https://pubsubhubbub.appspot.com/";
const RECENT_ENTRY_LIMIT = 50;

type RecentSearchEntry = {
  url: string;
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

function normalizeLastModified(value: Date | string | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function displayPath(value: string) {
  const pathname = new URL(value).pathname;
  if (pathname === "/") return "Ana sayfa";

  return decodeURIComponent(pathname)
    .split("/")
    .filter(Boolean)
    .map((part) => part.replaceAll("-", " "))
    .join(" › ");
}

function categoryTerm(value: string) {
  return new URL(value).pathname.split("/").filter(Boolean)[0] ?? "home";
}

async function loadRecentSearchEntries(): Promise<RecentSearchEntry[]> {
  const sitemap = await buildSitemap();
  const byUrl = new Map<string, RecentSearchEntry>();

  for (const entry of sitemap) {
    const updatedAt = normalizeLastModified(entry.lastModified);
    if (!updatedAt) continue;

    const parsed = new URL(entry.url);
    if (parsed.origin !== baseUrl) continue;

    const current = byUrl.get(entry.url);
    if (!current || updatedAt > current.updatedAt) {
      byUrl.set(entry.url, {
        url: entry.url,
        updatedAt,
      });
    }
  }

  return [...byUrl.values()]
    .sort((a, b) => {
      const byFreshness = b.updatedAt.getTime() - a.updatedAt.getTime();
      if (byFreshness !== 0) return byFreshness;
      return a.url.localeCompare(b.url, "tr");
    })
    .slice(0, RECENT_ENTRY_LIMIT);
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const recentEntries = await loadRecentSearchEntries();
  const feedUpdated =
    recentEntries[0]?.updatedAt ?? WRITING_GUIDE_STRUCTURED_DATA_UPDATED_AT;

  const entries = recentEntries.map(({ url, updatedAt }) => {
    const label = displayPath(url);
    return [
      "  <entry>",
      `    <id>${url}</id>`,
      `    <title>${escapeXml(`İlkOku güncellemesi — ${label}`)}</title>`,
      `    <link href="${url}" />`,
      `    <updated>${updatedAt.toISOString()}</updated>`,
      `    <category term="${escapeXml(categoryTerm(url))}" />`,
      `    <summary>${escapeXml(`İlkOku üzerindeki ${label} sayfası güncellendi.`)}</summary>`,
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
