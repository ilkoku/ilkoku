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
    "amazon-br-live",
    "bestseller60-nl-weekly",
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


test("Brazil Amazon bestseller source is source-native and part of the world table", () => {
  const brazil = source("src/lib/book-index/sources/amazon-br.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const model = source("src/lib/book-index/global-public-read-model.ts");
  const meanings = source("src/lib/book-index/turkish-title-meanings.ts");

  contains(brazil, 'const EXPECTED_BOOKS = 30', "Brazil exact Top 30 guard");
  contains(brazil, "p13n-asin-index-", "Brazil Amazon item parser");
  contains(brazil, "zg-bdg-text", "Brazil Amazon native rank parser");
  contains(brazil, "BOOK_INDEX_AMAZON_BR_RANK_ORDER_MISMATCH", "Brazil rank guard");
  contains(collector, "amazonBrazilBookIndexAdapter", "Brazil collector registration");
  contains(sources, 'code: "amazon-br"', "Brazil source registry");
  contains(lists, 'code: "amazon-br-live"', "Brazil list registry");
  contains(model, '"amazon-br-live"', "Brazil public world-list inclusion");
  contains(meanings, '"A Morte de Ivan Ilitch (2 ed.)": "İvan İlyiç\'in Ölümü"', "Brazil Turkish meaning registry");
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


test("Netherlands Bestseller 60 collector is source-native and public only after Turkish title meanings are ready", () => {
  const adapter = source("src/lib/book-index/sources/bestseller60-nl.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const model = source("src/lib/book-index/global-public-read-model.ts");
  const meanings = source("src/lib/book-index/turkish-title-meanings.ts");

  contains(adapter, 'const EXPECTED_BOOKS = 60', "Netherlands exact Top 60 guard");
  contains(adapter, "ISBN", "Netherlands ISBN parser");
  contains(adapter, 'line.startsWith("Bestseller 60 ")', "Netherlands heading parser tolerates inline navigation text");
  contains(adapter, '<!--[\\s\\S]*?-->', "Netherlands multiline HTML comments are stripped");
  contains(adapter, '.replace(/<[^>]+>/gu, "\\n")', "Netherlands rank boundaries remain separate lines");
  contains(adapter, '.split(/\\n+/u)', "Netherlands splits visible lines before HTML decoding");
  contains(adapter, '.map((line) => decodeBookIndexHtml(line))', "Netherlands decodes each visible line independently");
  contains(adapter, 'normalizeBookIndexText(line) === "toepassen"', "Netherlands skips archive controls before rank 1");
  contains(adapter, 'segment.join(" ").match', "Netherlands ISBN parser tolerates inline markup");
  contains(adapter, "lineIndex >= 2", "Netherlands title repetition guard tolerates extra inline markup");

  contains(adapter, "BOOK_INDEX_BESTSELLER60_NL_RANK_ORDER_MISMATCH", "Netherlands rank guard");
  contains(collector, "bestseller60NetherlandsBookIndexAdapter", "Netherlands collector registration");
  contains(sources, 'code: "bestseller60-nl"', "Netherlands source registry");
  contains(sources, 'market: "NL"', "Netherlands market code");
  contains(lists, 'code: "bestseller60-nl-weekly"', "Netherlands weekly list registry");
  contains(lists, "maxRank: 60", "Netherlands Top 60 bound");
  contains(
    model,
    '"bestseller60-nl-weekly"',
    "Netherlands is public after Turkish title meanings are prepared",
  );
  contains(
    meanings,
    '"De wereld rond met Project Gezond": "Project Gezond ile Dünya Turu"',
    "Netherlands Turkish meaning registry",
  );
});


test("Finland Kirjakauppaliitto collector is source-native and stays off the public world table until Turkish title meanings are ready", () => {
  const adapter = source("src/lib/book-index/sources/kirjakauppaliitto-fi.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const model = source("src/lib/book-index/global-public-read-model.ts");

  contains(adapter, 'const EXPECTED_BOOKS = 20', "Finland exact Top 20 guard");
  contains(adapter, 'text.includes("myydyimmät kaikki formaatit")', "Finland all-formats table anchor");
  contains(adapter, 'cells[2]', "Finland author column parser");
  contains(adapter, 'cells[3]', "Finland title column parser");
  contains(adapter, 'cells[4]', "Finland publisher column parser");
  contains(adapter, "BOOK_INDEX_KIRJAKAUPPALIITTO_FI_RANK_ORDER_MISMATCH", "Finland rank guard");
  contains(adapter, "BOOK_INDEX_KIRJAKAUPPALIITTO_FI_DUPLICATE_IDENTITY", "Finland identity guard");
  contains(collector, "kirjakauppaliittoFinlandBookIndexAdapter", "Finland collector registration");
  contains(sources, 'code: "kirjakauppaliitto-fi"', "Finland source registry");
  contains(sources, 'market: "FI"', "Finland market code");
  contains(lists, 'code: "kirjakauppaliitto-fi-monthly"', "Finland monthly list registry");
  contains(lists, 'period: "monthly"', "Finland monthly period");
  contains(lists, "maxRank: 20", "Finland Top 20 bound");
  notContains(
    model,
    '"kirjakauppaliitto-fi-monthly"',
    "Finland stays off the public world table until Turkish title meanings are prepared",
  );
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
    "Her sitenin kendi sıra numarası",
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


test("global bestseller Turkish titles prefer verified publications and fall back to Turkish meanings", () => {
  const model = source("src/lib/book-index/global-public-read-model.ts");
  const view = source("src/features/book-index/public/GlobalBestsellerView.tsx");
  const meanings = source("src/lib/book-index/turkish-title-meanings.ts");

  contains(model, 'marketCode: "TR"', "verified Turkish title candidates are limited to Turkey sources");
  contains(model, "includeInTurkeyIndex: true", "verified Turkish titles use approved Turkey index sources");
  contains(model, "masterBookId", "verified Turkish publication lookup requires an existing master book");
  contains(
    model,
    "normalizeBookIndexText(candidate) !== normalizeBookIndexText(item.title)",
    "duplicate original titles are not repeated as Turkish labels",
  );
  contains(model, "getBookIndexTurkishTitleMeaning(item.title)", "missing verified publications fall back to a Turkish meaning");
  contains(model, '"publication" as const', "verified publication titles remain distinguishable");
  contains(model, '"meaning" as const', "meaning-only labels remain distinguishable");
  contains(view, "row.turkishTitle", "Turkish counterpart is rendered beside the original title");
  contains(
    view,
    "yoksa yalnızca başlığın Türkçe anlamı verilir",
    "reader-facing copy explains the Turkish meaning fallback",
  );
  contains(
    view,
    "resmî yayın adı olarak değerlendirilmez",
    "reader-facing copy prevents Turkish meanings from being confused with official publication titles",
  );
  contains(meanings, '"The Love Hypothesis": "Aşk Hipotezi"', "English title meaning registry");
  contains(meanings, '"Le Casse du siècle": "Yüzyılın Soygunu"', "French title meaning registry");
  contains(meanings, '"El Hombre en busca de Sentido (fuera de colección)": "İnsanın Anlam Arayışı"', "Spain title meaning registry");
  contains(meanings, '"The 48 Laws of Power": "İktidarın 48 Yasası"', "Canada title meaning registry");
  contains(meanings, '"Alles wird Asche": "Her Şey Küle Dönecek"', "German title meaning registry");
  contains(meanings, '"세네카, 오늘을 빼앗기고 있는 당신에게": "Seneca, Bugünü Elinden Alınan Sana"', "Korean title meaning registry");
  contains(meanings, '"自分とか、ないから。 教養としての東洋哲学": "Ben Diye Bir Şey Yok: Genel Kültür Olarak Doğu Felsefesi"', "Japanese title meaning registry");
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
