import { GENRES } from "@/lib/genres";
import { WRITING_GUIDE_STRUCTURED_DATA_UPDATED_AT } from "@/lib/search-content-freshness";
import { WRITING_CATEGORY_HUBS } from "@/lib/writing-category-hubs";

const baseUrl = "https://ilkoku.com";
const feedUrl = `${baseUrl}/recent-updates.atom`;
const hubUrl = "https://pubsubhubbub.appspot.com/";

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

export const dynamic = "force-dynamic";

export async function GET() {
  const updated = WRITING_GUIDE_STRUCTURED_DATA_UPDATED_AT.toISOString();
  const entries = GENRES.map((genre) => {
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
      `    <updated>${updated}</updated>`,
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
    `  <updated>${updated}</updated>`,
    "  <author><name>İlkOku</name></author>",
    entries,
    "</feed>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
      "Content-Type": "application/atom+xml; charset=utf-8",
      Link: `<${hubUrl}>; rel="hub", <${feedUrl}>; rel="self"`,
    },
  });
}
