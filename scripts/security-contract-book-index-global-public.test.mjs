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

test("global bestseller public page reads only the six approved source lists", () => {
  const model = source("src/lib/book-index/global-public-read-model.ts");

  for (const listCode of [
    "amazon-us-live",
    "amazon-uk-live",
    "ibs-it-daily",
    "rakuten-jp-weekly",
    "kyobo-kr-weekly",
    "readings-au-monthly",
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
    "Sıra numaraları İlkOku tarafından yeniden",
    "source rank methodology",
  );
  contains(view, "item.rank", "source rank rendering");
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
  contains(view, "Bu liste için doğrulanmış güncel veri bekleniyor", "empty-state copy stays reader-facing");
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
