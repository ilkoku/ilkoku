import { getPublicWorkFeed } from "@/features/public-discovery/library";

const baseUrl = "https://ilkoku.com";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const dynamic = "force-dynamic";

export async function GET() {
  const works = await getPublicWorkFeed();
  const latestUpdate =
    works[0]?.updatedAt ?? new Date("2026-08-24T00:00:00.000Z");
  const items = works
    .map((work) => {
      const url = `${baseUrl}/kitap/${work.slug}`;
      const authorName =
        work.author.displayName ??
        work.author.fullName;
      const description =
        work.description?.replace(/\s+/gu, " ").trim() ||
        `${work.title}, ${authorName} tarafından İlkOku'da yayımlanan bir eser.`;

      return [
        "    <item>",
        `      <title>${escapeXml(work.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <dc:creator>${escapeXml(authorName)}</dc:creator>`,
        work.genre
          ? `      <category>${escapeXml(work.genre)}</category>`
          : "",
        `      <description>${escapeXml(description)}</description>`,
        `      <pubDate>${(
          work.publishedAt ?? work.updatedAt
        ).toUTCString()}</pubDate>`,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "  <channel>",
    "    <title>İlkOku — Keşfe Açık Eserler</title>",
    `    <link>${baseUrl}/eserler</link>`,
    `    <atom:link href="${baseUrl}/eserler/rss.xml" rel="self" type="application/rss+xml" />`,
    "    <description>İlkOku’da yayımlanan keşfe açık Türkçe eser vitrinleri.</description>",
    "    <language>tr-TR</language>",
    `    <lastBuildDate>${latestUpdate.toUTCString()}</lastBuildDate>`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Cache-Control":
        "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
