import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) =>
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("global bestseller public page reads only the approved source lists", () => {
  const model = source("src/lib/book-index/global-public-read-model.ts");

  for (const listCode of [
    "amazon-us-live",
    "amazon-uk-live",
    "ibs-it-daily",
    "rakuten-jp-weekly",
    "kyobo-kr-weekly",
    "readings-au-monthly",
    "spiegel-de-fiction-hardcover-weekly",
    "amazon-fr-live",
    "amazon-es-live",
    "amazon-ca-live",
  ]) {
    contains(model, `"${listCode}"`, `${listCode} approved global list`);
  }

  contains(
    model,
    "getBookIndexSourceListSnapshot(listCode, limit)",
    "global page reuses successful source snapshot reads",
  );
  contains(model, 'rolloutState: "public"', "global rollout is public");
  notContains(
    model,
    "includeInComposite",
    "global page does not build a cross-market composite rank",
  );
  notContains(
    model,
    "getTurkeySourceRankRows",
    "global page stays independent from Turkey ranking aggregation",
  );
});


test("Spain and Canada research sources stay fail-closed until ranked collectors are verified", () => {
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const model = source("src/lib/book-index/global-public-read-model.ts");

  contains(sources, 'code: "casadellibro-es"', "Spain research source registry");
  contains(sources, 'market: "ES"', "Spain market code");
  contains(sources, 'code: "indigo-ca"', "Canada research source registry");
  contains(sources, 'market: "CA"', "Canada market code");

  contains(lists, 'code: "casadellibro-es-bestsellers-research"', "Spain research list");
  contains(lists, 'code: "indigo-ca-globe-mail-weekly-research"', "Canada research list");
  contains(lists, "collectionEveryMinutes: null", "research lists are unscheduled");
  contains(lists, "enabled: false", "research lists are disabled");

  notContains(model, '"casadellibro-es-bestsellers-research"', "Spain is not public before rank verification");
  notContains(model, '"indigo-ca-globe-mail-weekly-research"', "Canada is not public before rank verification");
});


test("Spain and Canada Amazon bestseller sources are fail-closed and source-native", () => {
  const spain = source("src/lib/book-index/sources/amazon-es.ts");
  const canada = source("src/lib/book-index/sources/amazon-ca.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");

  for (const [label, adapter, prefix] of [
    ["Spain", spain, "BOOK_INDEX_AMAZON_ES"],
    ["Canada", canada, "BOOK_INDEX_AMAZON_CA"],
  ]) {
    contains(adapter, 'const EXPECTED_BOOKS = 30', `${label} exact Top 30 guard`);
    contains(adapter, "p13n-asin-index-", `${label} Amazon item parser`);
    contains(adapter, "zg-bdg-text", `${label} Amazon native rank parser`);
    contains(adapter, `${prefix}_RANK_ORDER_MISMATCH`, `${label} rank guard`);
  }

  contains(collector, "amazonSpainBookIndexAdapter", "Spain collector registration");
  contains(collector, "amazonCanadaBookIndexAdapter", "Canada collector registration");
  contains(sources, 'code: "amazon-es"', "Spain live source registry");
  contains(sources, 'code: "amazon-ca"', "Canada live source registry");
  contains(lists, 'code: "amazon-es-live"', "Spain live list registry");
  contains(lists, 'code: "amazon-ca-live"', "Canada live list registry");
});


test("France Amazon bestseller source is fail-closed and source-native", () => {
  const adapter = source("src/lib/book-index/sources/amazon-fr.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");

  contains(adapter, 'const EXPECTED_BOOKS = 30', "Amazon France exact Top 30 guard");
  contains(adapter, "p13n-asin-index-", "Amazon France item parser");
  contains(adapter, "zg-bdg-text", "Amazon France native rank parser");
  contains(adapter, "BOOK_INDEX_AMAZON_FR_RANK_ORDER_MISMATCH", "Amazon France rank guard");
  contains(collector, "amazonFranceBookIndexAdapter", "Amazon France collector registration");
  contains(sources, 'code: "amazon-fr"', "France source registry");
  contains(sources, 'market: "FR"', "France market code");
  contains(lists, 'code: "amazon-fr-live"', "France list registry");
  contains(lists, "maxRank: 30", "France Top 30 bound");
});


test("Germany SPIEGEL bestseller source is fail-closed and source-native", () => {
  const adapter = source("src/lib/book-index/sources/spiegel-de.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const view = source("src/features/book-index/public/GlobalBestsellerView.tsx");

  contains(adapter, 'const EXPECTED_BOOKS = 20', "SPIEGEL exact Top 20 guard");
  contains(adapter, "product-box__top-seller-number", "SPIEGEL native rank parser");
  contains(adapter, "product-box__name", "SPIEGEL title parser");
  contains(adapter, "product-box__manufacturer", "SPIEGEL author parser");
  contains(adapter, "BOOK_INDEX_SPIEGEL_DE_RANK_ORDER_MISMATCH", "SPIEGEL rank order guard");
  contains(collector, "spiegelGermanyBookIndexAdapter", "SPIEGEL collector registration");
  contains(sources, 'code: "spiegel-de"', "Germany source registry");
  contains(sources, 'market: "DE"', "Germany market code");
  contains(lists, 'code: "spiegel-de-fiction-hardcover-weekly"', "Germany weekly list registry");
  contains(lists, "maxRank: 20", "Germany list rank bound");
  contains(view, "haftalık kurgu", "Germany category scope stays visible to readers");
});


test("global bestseller page is indexable, discoverable and source-native", () => {
  const page = source("src/app/en-cok-satanlar/dunya/page.tsx");
  const view = source("src/features/book-index/public/GlobalBestsellerView.tsx");
  const sitemap = source("src/app/sitemap.ts");

  notContains(page, "notFound()", "global route is no longer gated");
  contains(page, "noIndex: false", "global page is indexable");
  contains(
    sitemap,
    "/en-cok-satanlar/dunya",
    "global page is included in the XML sitemap",
  );
  contains(
    view,
    "İlkOku ülkeler arasında ortak bir dünya sırası",
    "global view explicitly rejects an invented world rank",
  );
  contains(
    view,
    "sırası korunur.",
    "source rank methodology",
  );
  contains(view, "row.rank", "source rank rendering");
});


test("global bestseller overview links to the public world page", () => {
  const page = source("src/app/en-cok-satanlar/page.tsx");
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");

  contains(
    page,
    "showGlobalPreview",
    "overview explicitly enables the global card",
  );
  contains(
    view,
    'href="/en-cok-satanlar/dunya"',
    "overview links to the public global page",
  );
});


test("global public launch no longer depends on a preview environment flag", () => {
  const env = source(".env.example");
  const model = source("src/lib/book-index/global-public-read-model.ts");
  const page = source("src/app/en-cok-satanlar/dunya/page.tsx");

  notContains(env, "BOOK_INDEX_GLOBAL_PREVIEW_ENABLED", "obsolete preview env flag is removed");
  notContains(model, "BOOK_INDEX_GLOBAL_PREVIEW_ENABLED", "global read model has no preview gate");
  notContains(page, "isGlobalBestsellerPreviewEnabled", "global route has no preview gate");
});


test("global preview copy avoids internal collector terminology", () => {
  const page = source("src/app/en-cok-satanlar/dunya/page.tsx");
  const view = source("src/features/book-index/public/GlobalBestsellerView.tsx");
  const overview = source("src/features/book-index/public/BookIndexPublicView.tsx");

  notContains(view, "native sıralama", "public global view avoids English-native jargon");
  notContains(overview, "native", "global overview card avoids English-native jargon");
  contains(
    overview,
    "ilgili sitelerin kendi",
    "global overview card uses reader-facing Turkish wording",
  );
  notContains(view, "collector", "public global view avoids collector terminology");
  notContains(view, "snapshot", "public global view avoids snapshot terminology");
  contains(view, "Doğrulanmış güncel dünya verisi bekleniyor", "empty-state copy stays reader-facing");
  notContains(view, "kaynak bazında", "public global view avoids technical source wording");
  contains(view, "site site", "global overview uses natural Turkish wording");
  notContains(view, "Orijinal listeyi aç ↗", "global page omits source-level outbound list links");
  contains(view, "href={row.productUrl}", "individual book links remain available");
  contains(
    page,
    "ilgili sitelerin kendi sıralamalarıyla",
    "global metadata description uses reader-facing site wording",
  );
});


test("global bestseller Turkish titles come only from matched Turkey catalogue records", () => {
  const model = source("src/lib/book-index/global-public-read-model.ts");
  const view = source("src/features/book-index/public/GlobalBestsellerView.tsx");

  contains(model, 'marketCode: "TR"', "Turkish title candidates are limited to Turkey sources");
  contains(model, "includeInTurkeyIndex: true", "Turkish title candidates use approved Turkey index sources");
  contains(model, "masterBookId", "Turkish title lookup requires an existing matched master book");
  contains(
    model,
    "normalizeBookIndexText(candidate) !== normalizeBookIndexText(item.title)",
    "duplicate original titles are not repeated as Turkish labels",
  );
  contains(view, "row.turkishTitle", "verified Turkish title is exposed in the public world table");
  contains(
    view,
    "Türkiye kaynaklarında aynı esere doğrulanmış biçimde",
    "reader-facing copy explains when a Turkish title is shown",
  );
  contains(
    view,
    "otomatik çeviri resmî kitap adı gibi sunulmaz",
    "world table distinguishes verified Turkish publication titles from automatic translations",
  );
});


test("global bestseller table groups matching source-native ranks without repetition", () => {
  const view = source("src/features/book-index/public/GlobalBestsellerView.tsx");

  contains(view, "combinedRows", "global lists are combined into one table");
  contains(view, "a.rank - b.rank", "rows are ordered by source-native rank");
  contains(view, "combinedRows[index - 1]?.rank !== row.rank", "rank group boundaries are detected");
  contains(view, '{startsRankGroup ? row.rank : ""}', "repeated ranks are hidden within each group");
  contains(view, "styles.rankGroupStart", "rank groups keep a visual divider");
  contains(view, "row.sourceName", "country/source remains visible");
  contains(view, "row.period", "source period remains visible");
});


test("new releases page stays aligned across public discovery surfaces", () => {
  const page = source("src/app/yeni-cikanlar/page.tsx");
  const sitemap = source("src/app/sitemap.ts");
  const navigation = source("src/lib/cms-header-navigation.ts");

  contains(page, "noIndex: false", "new releases route remains indexable");
  contains(sitemap, "/yeni-cikanlar", "new releases route remains in XML sitemap");
  const line = navigation.split("\n").find((candidate) => candidate.includes('href: "/yeni-cikanlar"'));
  assert.ok(line, "new releases route exists in HTML sitemap inventory");
  assert.equal(line.includes("indexable: false"), false, "indexable new releases route is linked from HTML sitemap");
});


test("indexable Book Index discovery pages use crawl-friendly ISR", () => {
  const globalPage = source("src/app/en-cok-satanlar/dunya/page.tsx");
  const newReleasesPage = source("src/app/yeni-cikanlar/page.tsx");

  for (const [label, page] of [
    ["global bestsellers", globalPage],
    ["new releases", newReleasesPage],
  ]) {
    contains(page, "export const revalidate = 300;", `${label} 5-minute ISR`);
    notContains(page, 'export const dynamic = "force-dynamic";', `${label} force-dynamic regression`);
    contains(page, "noIndex: false", `${label} remains indexable`);
  }
});
