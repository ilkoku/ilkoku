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

test("book index keeps source, master book, run and immutable observation layers separate", () => {
  const schema = source("prisma/schema.prisma");
  const migration = source(
    "prisma/migrations/20260925133000_book_index_foundation/migration.sql",
  );

  contains(schema, "model BookIndexSource {", "source model");
  contains(schema, "model BookIndexList {", "source list model");
  contains(schema, "model BookIndexBook {", "master book model");
  contains(schema, "model BookIndexExternalBook {", "source-local book model");
  contains(schema, "model BookIndexFetchRun {", "isolated fetch run model");
  contains(schema, "model BookIndexObservation {", "snapshot observation model");
  contains(
    schema,
    "@@unique([fetchRunId, externalBookId])",
    "one source-book observation per fetch run",
  );
  contains(
    migration,
    "CREATE TABLE `BookIndexObservation`",
    "versioned observation migration",
  );
});

test("book index source registry separates Amazon US from the Turkey composite", () => {
  const registry = source("src/lib/book-index/sources.ts");

  for (const code of [
    "kitapyurdu",
    "bkm",
    "dr",
    "idefix",
    "penguen",
    "remzi",
    "amazon-tr",
    "amazon-us",
  ]) {
    contains(registry, `code: "${code}"`, `${code} V1 source`);
  }

  contains(
    registry,
    "export const TURKEY_INDEX_MIN_SOURCES = 3;",
    "minimum independent source threshold",
  );
  contains(registry, 'code: "amazon-us"', "Amazon US source");
  contains(
    registry,
    'name: "Amazon ABD",\n    market: "US",\n    countryCode: "US",\n    baseUrl: "https://www.amazon.com",\n    includeInTurkeyIndex: false',
    "Amazon US excluded from Turkey composite",
  );
});

test("Turkey score normalizes rank and collapses duplicate storefront and operator votes", () => {
  const ranking = source("src/lib/book-index/ranking.ts");

  contains(
    ranking,
    "((listSize - rank + 1) / listSize) * 100",
    "1-100 normalized rank formula",
  );
  contains(
    ranking,
    "const bySource = new Map<string, BookIndexSourceVoteInput>();",
    "one-vote-per-source map",
  );
  contains(
    ranking,
    "sourceCount < TURKEY_INDEX_MIN_SOURCES",
    "minimum independent-source eligibility gate",
  );
  contains(
    ranking,
    "const byIndependenceGroup = new Map<string, BookIndexSourceVote[]>();",
    "one-vote-per-independent-operator grouping",
  );
  contains(
    ranking,
    "getBookIndexSourceIndependenceGroup",
    "operator independence lookup",
  );
  contains(
    ranking,
    "groupVotes.reduce(",
    "same-operator storefront scores are averaged into one vote",
  );
  contains(
    ranking,
    "candidatePriority > currentPriority",
    "explicit list priority selection",
  );
});

test("book index lives inside the existing system management shell", () => {
  const page = source("src/app/admin/kitap-endeksi/page.tsx");
  const navigation = source("src/lib/admin-navigation.ts");
  const nextConfig = source("next.config.ts");

  contains(page, "<h1>Kitap Endeksi</h1>", "single book index admin entry");
  contains(
    navigation,
    'systemPath("/kitap-endeksi"), label: "Kitap Endeksi"',
    "system navigation entry",
  );
  contains(
    nextConfig,
    '"/sistem-yonetimi/:path*"',
    "system management remains private/noindex",
  );
});

test("foundation does not publish Book Index sitemap entries before the public gate passes", () => {
  const sitemap = source("src/app/sitemap.ts");
  const contract = source("docs/BOOK_INDEX_V1.md");

  contains(
    sitemap,
    "loadBookIndexSitemapEntries",
    "Book Index sitemap entries are isolated behind a gate helper",
  );
  contains(
    sitemap,
    "if (!context || context.model.turkey.availability !== \"available\")",
    "Book Index sitemap fails closed without publishable Turkey data",
  );

  const fallbackStart = sitemap.indexOf("const staticFallbackEntries");
  const fallbackEnd = sitemap.indexOf("type CmsSitemapRow", fallbackStart);
  assert.ok(fallbackStart >= 0 && fallbackEnd > fallbackStart, "static fallback block must exist");
  const fallbackBlock = sitemap.slice(fallbackStart, fallbackEnd);
  notContains(
    fallbackBlock,
    "/en-cok-satanlar",
    "fallback sitemap never publishes Book Index",
  );

  contains(
    contract,
    "İlk foundation PR public indexable sayfa oluşturmaz.",
    "SEO readiness gate",
  );
});

test("sponsorship is kept separate from organic book index rank", () => {
  const contract = source("docs/BOOK_INDEX_V1.md");

  contains(
    contract,
    "Sponsor içerik organik sıralamayı asla değiştiremez.",
    "organic rank independence",
  );
  contains(
    contract,
    "Sponsorlu kartlar organik rank dizisine eklenmez ve sıra numarası almaz.",
    "sponsored card separation",
  );
});

test("first live collector is fail-closed and source-isolated", () => {
  const collector = source("src/lib/book-index/collector.ts");
  const remzi = source("src/lib/book-index/sources/remzi.ts");
  const lists = source("src/lib/book-index/lists.ts");

  contains(lists, 'code: "remzi-tr-weekly"', "Remzi weekly list");
  contains(lists, 'collectionEveryMinutes: 1440', "daily check ceiling for weekly source");
  contains(collector, "const adapters = new Map<string, BookIndexSourceAdapter>", "source-local adapter registry");
  contains(collector, 'status: "running"', "fetch run begins before remote collection");
  contains(collector, 'status: "failed"', "collector failure is persisted");
  contains(collector, "transaction.bookIndexObservation.create", "rank snapshots are append-only");
  contains(remzi, 'class=["\'][^"\']*\\bturkish-books', "Remzi Turkish bestseller selector");
  contains(remzi, "\\bbook-name\\b", "Remzi book anchor selector");
  contains(remzi, "BOOK_INDEX_REMZI_RESULT_TOO_SMALL", "parser fails closed on suspiciously small result");
  contains(remzi, '"User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)"', "transparent collector user agent");
  contains(remzi, "AbortSignal.timeout(20_000)", "bounded remote request");
});

test("blocked sources are not bypassed by the book index collector", () => {
  const sources = source("src/lib/book-index/sources.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(sources, 'code: "kitapyurdu"', "Kitapyurdu registry entry");
  contains(
    sources,
    'baseUrl: "https://www.kitapyurdu.com",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "blocked"',
    "Kitapyurdu automated access block is explicit",
  );
  contains(
    collector,
    'sourceDefinition.collectionState === "blocked" ? "blocked" : "active"',
    "blocked source persistence",
  );
  contains(
    collector,
    'source.status !== "active"',
    "blocked source execution gate",
  );
});

test("book index manual collection stays admin-controlled while scheduler is active", () => {
  const action = source("src/features/book-index/admin-actions.ts");
  const page = source("src/app/admin/kitap-endeksi/page.tsx");

  contains(action, 'admin.role !== "admin"', "admin-only manual collection");
  contains(action, "collectBookIndexListByCode", "manual collector action");
  contains(page, "Şimdi kontrol et", "manual source verification control");
  contains(page, "Saatlik scheduler aktiftir", "active scheduler status");
  notContains(page, "Otomatik scheduler bu aşamada kapalıdır", "stale scheduler-off status removed");
});



test("BKM collector uses verified public bestseller feed and caps the V1 list at Top 50", () => {
  const bkm = source("src/lib/book-index/sources/bkm.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const sources = source("src/lib/book-index/sources.ts");

  contains(bkm, 'const ENDPOINT = "https://bkm-best.wawlabs.com/top_sellers";', "verified BKM feed");
  contains(bkm, 'case "bkm-tr-weekly"', "weekly span");
  contains(bkm, 'case "bkm-tr-monthly"', "monthly span");
  contains(bkm, 'case "bkm-tr-yearly"', "yearly span");
  contains(bkm, "const MAX_BOOKS = 50;", "Top 50 cap");
  contains(bkm, "BOOK_INDEX_BKM_RESULT_TOO_SMALL", "fail-closed minimum result");
  contains(bkm, "BOOK_INDEX_BKM_RANK_ORDER_MISMATCH", "feed order validation");
  contains(bkm, "BOOK_INDEX_BKM_DUPLICATE_SOURCE_KEY", "source identity validation");
  contains(lists, 'code: "bkm-tr-weekly"', "BKM weekly list registry");
  contains(lists, 'code: "bkm-tr-monthly"', "BKM monthly list registry");
  contains(lists, 'code: "bkm-tr-yearly"', "BKM yearly list registry");
  contains(collector, "[bkmBookIndexAdapter.sourceCode, bkmBookIndexAdapter]", "BKM adapter activation");
  contains(
    sources,
    'baseUrl: "https://www.bkmkitap.com",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "ready"',
    "BKM source ready state",
  );
});

test("only BKM weekly contributes to the Turkey composite in V1", () => {
  const lists = source("src/lib/book-index/lists.ts");

  contains(
    lists,
    'code: "bkm-tr-weekly",\n    sourceCode: "bkm",\n    title: "BKM Kitap · Haftalık Çok Satanlar",\n    categoryKey: "general",\n    period: "weekly",\n    sourceUrl: "https://www.bkmkitap.com/cok-satan-kitaplar",\n    maxRank: 50,\n    includeInComposite: true',
    "weekly BKM composite vote",
  );
  contains(
    lists,
    'code: "bkm-tr-monthly",\n    sourceCode: "bkm",\n    title: "BKM Kitap · Aylık Çok Satanlar",\n    categoryKey: "general",\n    period: "monthly",\n    sourceUrl: "https://www.bkmkitap.com/cok-satan-kitaplar",\n    maxRank: 50,\n    includeInComposite: false',
    "monthly BKM source-only list",
  );
});


test("Amazon sources remain fail-closed until a stable sanctioned collector path exists", () => {
  const sources = source("src/lib/book-index/sources.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(
    sources,
    'baseUrl: "https://www.amazon.com.tr",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "researching"',
    "Amazon TR remains research-only",
  );
  contains(
    sources,
    'baseUrl: "https://www.amazon.com",\n    includeInTurkeyIndex: false,\n    phase: "v1",\n    collectionState: "blocked"',
    "Amazon US automated access block",
  );
  notContains(
    collector,
    'sourceCode: "amazon-us"',
    "Amazon US collector is not activated",
  );
});


test("D&R access protection remains fail-closed", () => {
  const sources = source("src/lib/book-index/sources.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(
    sources,
    'baseUrl: "https://www.dr.com.tr",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "blocked"',
    "D&R protected source state",
  );
  notContains(
    collector,
    'sourceCode: "dr"',
    "D&R collector is not activated",
  );
});

test("idefix collector reads server-side Next data and excludes source-sponsored cards", () => {
  const adapter = source("src/lib/book-index/sources/idefix.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const sources = source("src/lib/book-index/sources.ts");

  contains(adapter, "__NEXT_DATA__", "idefix server-side data source");
  contains(adapter, "sourceVariant.isSponsored === true", "source-sponsored cards excluded");
  contains(adapter, "rank: index + 1", "organic idefix order is contiguous");
  contains(adapter, "BOOK_INDEX_IDEFIX_RESULT_TOO_SMALL", "idefix suspicious result gate");
  contains(lists, 'code: "idefix-tr-live"', "idefix list registry");
  contains(lists, 'sourceUrl: "https://www.idefix.com/cok-satanlar-l-162"', "verified idefix URL");
  contains(collector, "[idefixBookIndexAdapter.sourceCode, idefixBookIndexAdapter]", "idefix adapter activation");
  contains(
    sources,
    'baseUrl: "https://www.idefix.com",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "ready"',
    "idefix ready state",
  );
});

test("Book Index matching follows ISBN then exact title-author and preserves manual decisions", () => {
  const matching = source("src/lib/book-index/matching.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const page = source("src/app/admin/kitap-endeksi/page.tsx");

  contains(matching, "if (externalBook.isbn13)", "ISBN-13 first matching");
  contains(matching, "if (!existing && externalBook.isbn10)", "ISBN-10 fallback matching");
  contains(matching, "if (!existing && normalizedAuthor)", "title-author fallback after ISBN misses");
  contains(matching, "compatibleCandidates", "ISBN-compatible title-author fallback");
  contains(matching, "isbnCompatible", "conflicting ISBN protection");
  contains(matching, 'externalBook.matchStatus === "manual_matched"', "manual match preservation");
  contains(matching, 'externalBook.matchStatus === "rejected"', "manual rejection preservation");
  contains(matching, "if (compatibleCandidates.length > 1)", "ambiguous compatible title-author remains pending");
  contains(matching, 'matchConfidence: confidence', "matching confidence persistence");
  contains(collector, "autoMatchBookIndexExternalBook(", "matching runs during collection");
  contains(page, "Bekleyenleri eşleştir", "admin matching backfill control");
});

test("Turkey Index admin preview uses only latest composite lists and matched master books", () => {
  const readModel = source("src/lib/book-index/read-model.ts");
  const page = source("src/app/admin/kitap-endeksi/page.tsx");

  contains(readModel, "includeInComposite: true", "composite-only list query");
  contains(readModel, 'status: { in: ["success", "no_change"] }', "latest successful run gate");
  contains(readModel, "masterBookId", "master-book identity requirement");
  contains(readModel, "computeTurkeyBookIndexScore", "shared scoring contract");
  contains(readModel, "itemsStored", "actual observed list size normalization");
  contains(page, "Türkiye Endeksi önizleme", "admin-only composite preview");
  contains(
    page,
    "henüz public veya sitemap",
    "public rollout remains gated",
  );
});

test("KitapSepeti collector parses the verified server-rendered bestseller catalog", () => {
  const adapter = source("src/lib/book-index/sources/kitapsepeti.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(adapter, 'const MAX_BOOKS = 60;', "KitapSepeti native page cap");
  contains(adapter, 'const MIN_EXPECTED_BOOKS = 20;', "KitapSepeti fail-closed minimum");
  contains(adapter, '\\sproduct-item', "product card selector");
  contains(adapter, '\\bproduct-title\\b', "title selector");
  contains(adapter, '\\bbrand-title\\b', "publisher selector");
  contains(adapter, '\\bmodel-title\\b', "author selector");
  contains(adapter, "BOOK_INDEX_KITAPSEPETI_RESULT_TOO_SMALL", "small result rejection");
  contains(adapter, "BOOK_INDEX_KITAPSEPETI_DUPLICATE_SOURCE_KEY", "duplicate source protection");
  contains(lists, 'code: "kitapsepeti-tr-live"', "KitapSepeti list registry");
  contains(lists, 'maxRank: 60', "KitapSepeti current-page rank ceiling");
  contains(collector, "[kitapSepetiBookIndexAdapter.sourceCode, kitapSepetiBookIndexAdapter]", "KitapSepeti adapter activation");
  contains(
    sources,
    'baseUrl: "https://www.kitapsepeti.com",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "ready"',
    "KitapSepeti promoted to V1 ready",
  );
});

test("Kitapzen collector parses verified bestseller cards with ISBN and period lists", () => {
  const adapter = source("src/lib/book-index/sources/kitapzen.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(adapter, 'const MAX_BOOKS = 20;', "Kitapzen page size");
  contains(adapter, 'const MIN_EXPECTED_BOOKS = 15;', "Kitapzen fail-closed minimum");
  contains(adapter, 'data-prd-barcode', "Kitapzen ISBN source");
  contains(adapter, '\\bProduct_b\\b', "Kitapzen product card selector");
  contains(adapter, '\\bwriter\\b', "Kitapzen author selector");
  contains(adapter, '\\bpublisher\\b', "Kitapzen publisher selector");
  contains(adapter, "BOOK_INDEX_KITAPZEN_RESULT_TOO_SMALL", "Kitapzen suspicious result rejection");
  contains(adapter, "BOOK_INDEX_KITAPZEN_DUPLICATE_SOURCE_KEY", "Kitapzen duplicate protection");
  contains(lists, 'code: "kitapzen-tr-weekly"', "Kitapzen weekly list");
  contains(lists, 'code: "kitapzen-tr-monthly"', "Kitapzen monthly list");
  contains(lists, 'code: "kitapzen-tr-yearly"', "Kitapzen yearly list");
  contains(collector, "[kitapzenBookIndexAdapter.sourceCode, kitapzenBookIndexAdapter]", "Kitapzen adapter activation");
  contains(
    sources,
    'baseUrl: "https://www.kitapzen.com",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "ready"',
    "Kitapzen promoted to V1 ready",
  );
});

test("only Kitapzen weekly contributes to the Turkey composite", () => {
  const lists = source("src/lib/book-index/lists.ts");

  contains(
    lists,
    'code: "kitapzen-tr-weekly",\n    sourceCode: "kitapzen",\n    title: "Kitapzen · Haftalık Çok Satanlar",\n    categoryKey: "general",\n    period: "weekly"',
    "Kitapzen weekly composite list",
  );
  contains(
    lists,
    'code: "kitapzen-tr-monthly",\n    sourceCode: "kitapzen",\n    title: "Kitapzen · Aylık Çok Satanlar",\n    categoryKey: "general",\n    period: "monthly"',
    "Kitapzen monthly source-only list",
  );
});

test("Inkilap collector parses verified bestseller cards with safe ISBN handling", () => {
  const adapter = source("src/lib/book-index/sources/inkilap.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(adapter, 'const MAX_BOOKS = 20;', "Inkilap page size");
  contains(adapter, 'const MIN_EXPECTED_BOOKS = 15;', "Inkilap fail-closed minimum");
  contains(adapter, '\\bproductBox\\b', "Inkilap product card selector");
  contains(adapter, 'data-barcode', "Inkilap barcode source");
  contains(adapter, '/^(?:978|979)[0-9]{10}$/u', "only ISBN prefixes become isbn13");
  contains(adapter, '\\bitem-product-name\\b', "Inkilap title field");
  contains(adapter, '\\bitem-product-brand\\b', "Inkilap publisher field");
  contains(adapter, "splitTitleAndAuthor", "Inkilap title-author split");
  contains(adapter, "BOOK_INDEX_INKILAP_RESULT_TOO_SMALL", "Inkilap suspicious result rejection");
  contains(adapter, "BOOK_INDEX_INKILAP_DUPLICATE_SOURCE_KEY", "Inkilap duplicate protection");
  contains(lists, 'code: "inkilap-tr-live"', "Inkilap list registry");
  contains(collector, "[inkilapBookIndexAdapter.sourceCode, inkilapBookIndexAdapter]", "Inkilap adapter activation");
  contains(
    sources,
    'baseUrl: "https://www.inkilap.com",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "ready"',
    "Inkilap promoted to V1 ready",
  );
});

test("KitapSec category collector parses explicit ItemList ranks and ISBN metadata", () => {
  const adapter = source("src/lib/book-index/sources/kitapsec.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(adapter, 'const MAX_BOOKS = 48;', "KitapSec source page cap");
  contains(adapter, 'const MIN_EXPECTED_BOOKS = 20;', "KitapSec fail-closed minimum");
  contains(adapter, '\\bKs_ContentUrunList\\b', "KitapSec canonical ItemList scope");
  contains(adapter, '\\bKs_UrunSatir\\b', "KitapSec ranked card selector");
  contains(adapter, 'itemprop=["\']position', "KitapSec explicit rank metadata");
  contains(adapter, 'itemprop=["\']sku', "KitapSec ISBN metadata");
  contains(adapter, 'new TextDecoder("windows-1254")', "KitapSec source encoding");
  contains(adapter, "BOOK_INDEX_KITAPSEC_LIST_NOT_FOUND", "KitapSec list scope failure");
  contains(adapter, "BOOK_INDEX_KITAPSEC_RESULT_TOO_SMALL", "KitapSec suspicious result rejection");
  contains(adapter, "BOOK_INDEX_KITAPSEC_RANK_SEQUENCE_INVALID", "KitapSec rank continuity validation");
  contains(adapter, "BOOK_INDEX_KITAPSEC_DUPLICATE_ITEM", "KitapSec duplicate rank/source protection");
  contains(lists, 'code: "kitapsec-edebiyat-live"', "KitapSec Edebiyat list");
  contains(lists, 'categoryKey: "edebiyat"', "KitapSec category scope");
  contains(
    lists,
    'code: "kitapsec-cocuk-genclik-live",\n    sourceCode: "kitapsec",\n    title: "KitapSeç · Çocuk ve Gençlik Çok Satan Kitaplar",\n    categoryKey: "cocuk-genclik",\n    period: "live",\n    sourceUrl: "https://www.kitapsec.com/Products/Cocuk-ve-Genclik-Kitaplari/Cok-Satan-Kitaplar/",\n    maxRank: 48,\n    includeInComposite: false',
    "KitapSec child and youth category list",
  );
  contains(lists, 'includeInComposite: false', "KitapSec category excluded from general composite");
  contains(collector, "[kitapSecBookIndexAdapter.sourceCode, kitapSecBookIndexAdapter]", "KitapSec adapter activation");
  contains(
    sources,
    'baseUrl: "https://www.kitapsec.com",\n    includeInTurkeyIndex: true,\n    phase: "phase_2",\n    collectionState: "ready"',
    "KitapSec category source ready",
  );
});



test("Hepsiburada protected bestseller surface remains fail-closed", () => {
  const sources = source("src/lib/book-index/sources.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(
    sources,
    'baseUrl: "https://www.hepsiburada.com",\n    includeInTurkeyIndex: true,\n    phase: "phase_2",\n    collectionState: "blocked"',
    "Hepsiburada transparent request block",
  );
  notContains(
    collector,
    'sourceCode: "hepsiburada"',
    "Hepsiburada collector is not activated",
  );
});


test("Trendyol and PttAVM protected book surfaces remain fail-closed", () => {
  const sources = source("src/lib/book-index/sources.ts");
  const collector = source("src/lib/book-index/collector.ts");

  for (const [baseUrl, label] of [
    ["https://www.trendyol.com", "Trendyol"],
    ["https://www.pttavm.com", "PttAVM"],
  ]) {
    contains(
      sources,
      `baseUrl: "${baseUrl}",\n    includeInTurkeyIndex: true,\n    phase: "phase_2",\n    collectionState: "blocked"`,
      `${label} protected source state`,
    );
  }

  notContains(collector, 'sourceCode: "trendyol"', "Trendyol collector is not activated");
  notContains(collector, 'sourceCode: "pttavm"', "PttAVM collector is not activated");
});


test("Book Index public readiness stays evidence-based and non-publishing", () => {
  const readiness = source("src/lib/book-index/readiness.ts");
  const page = source("src/app/admin/kitap-endeksi/page.tsx");
  const sitemap = source("src/app/sitemap.ts");

  contains(
    readiness,
    "observedCompositeSourceCodes",
    "observed composite-source metric",
  );
  contains(
    readiness,
    "matchedExternalBookCount",
    "master matching coverage metric",
  );
  contains(
    readiness,
    "historySpanDays",
    "historical coverage metric",
  );
  contains(
    readiness,
    'publicRolloutState: "gated"',
    "public rollout remains gated",
  );
  contains(page, "Public / SEO readiness", "admin readiness section");
  contains(page, "Public kapalı", "truthful public state");
  contains(
    page,
    "kalite eşikleri ayrıca",
    "no invented readiness threshold",
  );
  contains(
    sitemap,
    "loadBookIndexSitemapEntries",
    "public readiness can only feed the gated sitemap helper",
  );
});


test("Book Index sponsor integration points default off and never alter organic rank", () => {
  const sponsor = source("src/lib/book-index/sponsor.ts");
  const page = source("src/app/admin/kitap-endeksi/page.tsx");

  for (const code of [
    "book-index-general-sponsor",
    "book-index-category-sponsor",
    "book-index-source-sponsor",
  ]) {
    contains(sponsor, `code: "${code}"`, `${code} slot contract`);
  }

  contains(sponsor, "enabledByDefault: false", "sponsor slots default off");
  contains(sponsor, "affectsOrganicRank: false", "sponsor cannot alter rank");
  contains(sponsor, "takesOrganicRankNumber: false", "sponsor has no organic rank number");
  contains(
    sponsor,
    'managementSurface: "banner-advertising"',
    "existing banner management integration boundary",
  );
  contains(page, "default OFF", "truthful sponsor state");
  contains(page, "Banner / Reklam Alanları", "existing ad management surface");
});


test("Book Index reconciliation only merges safe auto-matched duplicate masters", () => {
  const reconciliation = source("src/lib/book-index/reconciliation.ts");
  const scheduler = source("src/lib/book-index/scheduler.ts");

  contains(reconciliation, 'matchStatus: "auto_matched"', "auto-match-only reconciliation scope");
  contains(reconciliation, 'book.matchStatus !== "auto_matched"', "manual and non-auto decisions are protected");
  contains(reconciliation, "isbn13s.length > 1 || isbn10s.length > 1", "conflicting ISBN groups are skipped");
  contains(reconciliation, "group.sourceIds.size < 2 || group.masterIds.size < 2", "cross-source duplicate requirement");
  contains(reconciliation, "masterBookId: canonical.id", "duplicate external books are relinked");
  contains(reconciliation, "bookIndexBook.deleteMany", "orphan donor masters are removed only after relinking");
  contains(scheduler, "reconcileAutoMatchedBookIndexMasters", "scheduler executes bounded reconciliation");
});


test("composite collectors use deeper native bestseller pagination without changing the 3-source threshold", () => {
  const lists = source("src/lib/book-index/lists.ts");
  const kitapzen = source("src/lib/book-index/sources/kitapzen.ts");
  const inkilap = source("src/lib/book-index/sources/inkilap.ts");
  const kitapsepeti = source("src/lib/book-index/sources/kitapsepeti.ts");
  const sources = source("src/lib/book-index/sources.ts");

  contains(sources, "export const TURKEY_INDEX_MIN_SOURCES = 3;", "3-source eligibility remains unchanged");
  contains(lists, 'code: "kitapzen-tr-weekly"', "Kitapzen weekly composite");
  contains(lists, 'maxRank: 60', "expanded composite rank ceiling");
  contains(kitapzen, "for (let page = 1; page <= 3; page += 1)", "Kitapzen first three native pages");
  contains(kitapzen, '(page - 1) * MAX_BOOKS', "Kitapzen contiguous native rank offsets");
  contains(inkilap, "for (let page = 1; page <= 3; page += 1)", "Inkilap first three native pages");
  contains(inkilap, '/sayfa/${page}', "Inkilap native pagination path");
  contains(inkilap, '(page - 1) * MAX_BOOKS', "Inkilap contiguous native rank offsets");
  contains(kitapsepeti, 'const MAX_BOOKS = 60;', "KitapSepeti accepts the full current native page within a bounded ceiling");
});


test("Book Index readiness measures edition-family overlap without mutating matching", () => {
  const readiness = source("src/lib/book-index/readiness.ts");
  const matching = source("src/lib/book-index/matching.ts");

  contains(readiness, "EDITION_FAMILY_SUFFIXES", "bounded edition-family suffix diagnostics");
  contains(readiness, "editionFamilyTitle", "edition-family diagnostic normalizer");
  contains(readiness, "editionFamilyIdentityKeysOnAtLeast2Sources", "2-source edition-family metric");
  contains(readiness, "editionFamilyIdentityKeysOnAtLeast3Sources", "3-source edition-family metric");
  contains(readiness, "editionFamilyVariantOverlapSamples", "edition-family diagnostic samples");
  notContains(matching, "editionFamilyTitle", "edition-family diagnostic does not change matching");
});


test("Illa Kitap weekly bestseller collector is a bounded independent Turkey composite voter", () => {
  const adapter = source("src/lib/book-index/sources/illakitap.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(adapter, 'const MAX_BOOKS = 100;', "Illa Kitap native result ceiling");
  contains(adapter, 'const MIN_EXPECTED_BOOKS = 40;', "Illa Kitap fail-closed minimum");
  contains(adapter, '\\bProduct_([0-9]+)', "stable product id class");
  contains(adapter, 'data-prd-barcode', "Illa Kitap ISBN metadata");
  contains(adapter, '/^(?:978|979)[0-9]{10}$/u', "only ISBN prefixes become isbn13");
  contains(adapter, '\\bname\\b', "canonical product title selector");
  contains(adapter, '\\bwriter\\b', "author selector");
  contains(adapter, '\\bpublisher\\b', "publisher selector");
  contains(adapter, "BOOK_INDEX_ILLAKITAP_RESULT_TOO_SMALL", "small result rejection");
  contains(adapter, "BOOK_INDEX_ILLAKITAP_DUPLICATE_SOURCE_KEY", "duplicate source protection");
  contains(lists, 'code: "illakitap-tr-weekly"', "Illa Kitap weekly list");
  contains(lists, 'period: "weekly"', "weekly source period");
  contains(lists, 'maxRank: 100', "bounded weekly rank ceiling");
  contains(lists, 'includeInComposite: true', "Illa Kitap independent composite vote");
  contains(
    sources,
    'baseUrl: "https://www.illakitap.com",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "ready"',
    "Illa Kitap ready source state",
  );
  contains(
    collector,
    "[illaKitapBookIndexAdapter.sourceCode, illaKitapBookIndexAdapter]",
    "Illa Kitap adapter activation",
  );
  contains(
    sources,
    "export const TURKEY_INDEX_MIN_SOURCES = 3;",
    "3-source eligibility remains unchanged",
  );
});


test("NobelKitap bestseller collector is a bounded independent Turkey composite voter", () => {
  const adapter = source("src/lib/book-index/sources/nobelkitap.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(adapter, 'const MAX_BOOKS = 50;', "NobelKitap native bestseller cap");
  contains(adapter, 'const MIN_EXPECTED_BOOKS = 40;', "NobelKitap fail-closed minimum");
  contains(adapter, '\\bgroup\\b', "NobelKitap product anchor selector");
  contains(adapter, '\\bh-full\\b', "NobelKitap product anchor scope");
  contains(adapter, '\\/kitap\\/', "NobelKitap product URL scope");
  contains(adapter, '/-(97[89][0-9]{10})$/u', "ISBN-13 extraction from canonical product URL");
  contains(adapter, '\\bfont-medium\\b', "NobelKitap title field");
  contains(adapter, '\\btext-gray-600\\b', "NobelKitap author field");
  contains(adapter, "BOOK_INDEX_NOBELKITAP_RESULT_TOO_SMALL", "NobelKitap suspicious result rejection");
  contains(adapter, "BOOK_INDEX_NOBELKITAP_DUPLICATE_SOURCE_KEY", "NobelKitap duplicate key protection");
  contains(lists, 'code: "nobelkitap-tr-live"', "NobelKitap list registry");
  contains(lists, 'sourceUrl: "https://www.nobelkitap.com/cok-satanlar"', "NobelKitap canonical bestseller page");
  contains(lists, 'maxRank: 50', "NobelKitap native rank ceiling");
  contains(lists, 'includeInComposite: true', "NobelKitap independent composite vote");
  contains(
    sources,
    'baseUrl: "https://www.nobelkitap.com",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "ready"',
    "NobelKitap ready source state",
  );
  contains(
    collector,
    "[nobelKitapBookIndexAdapter.sourceCode, nobelKitapBookIndexAdapter]",
    "NobelKitap adapter activation",
  );
  contains(
    sources,
    "export const TURKEY_INDEX_MIN_SOURCES = 3;",
    "3-source eligibility remains unchanged",
  );
});


test("Book Index readiness distinguishes storefront sources from independent operators", () => {
  const sources = source("src/lib/book-index/sources.ts");
  const readiness = source("src/lib/book-index/readiness.ts");
  const ranking = source("src/lib/book-index/ranking.ts");

  contains(sources, 'independenceGroup: "point-internet"', "shared Point operator group");
  contains(sources, 'operatorName: "Point İnternet Teknolojileri ve Lojistik A.Ş."', "documented Point operator");
  contains(sources, "getBookIndexSourceIndependenceGroup", "source independence lookup");
  contains(readiness, "compositeIndependenceGroupTarget", "independent operator target");
  contains(readiness, "observedCompositeIndependenceGroups", "observed independent operator count");
  contains(readiness, "sharedOperatorGroups", "shared-operator collision samples");
  contains(readiness, "maxIndependentCompositeSourcesPerBook", "per-book independent source ceiling");
  contains(readiness, "booksOnAtLeast3IndependentCompositeSources", "independent 3-source overlap metric");
  contains(readiness, "sameIndependenceGroup", "pair matrix operator relationship");
  contains(readiness, "independentSourceCount", "near-3 independent-source count");
  contains(ranking, "independenceGroup", "independent operator grouping governs ranking");
  contains(sources, "export const TURKEY_INDEX_MIN_SOURCES = 3;", "3-source threshold stays unchanged");
});


test("KitaplarSepette is a bounded independent Turkey composite voter", () => {
  const adapter = source("src/lib/book-index/sources/kitaplarsepette.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const lists = source("src/lib/book-index/lists.ts");

  contains(adapter, 'const MAX_BOOKS = 30;', "bounded KitaplarSepette Top 30");
  contains(adapter, 'const MIN_EXPECTED_BOOKS = 25;', "fail-closed list minimum");
  contains(adapter, 'const DETAIL_CONCURRENCY = 6;', "bounded detail-page concurrency");
  contains(adapter, 'className.split(/\\s+/u).includes("card-product")', "exact bestseller card class token");
  contains(adapter, "\\bc-p-i-link\\b", "canonical product link selector");
  contains(adapter, "\\baddCart\\(", "stable product id extraction");
  contains(adapter, "\\bBarkod\\s*:", "ISBN detail metadata");
  contains(adapter, 'detailLabelValue(html, "Yazar")', "author detail metadata");
  contains(adapter, 'detailLabelValue(html, "Yayınevi")', "publisher detail metadata");
  contains(adapter, "BOOK_INDEX_KITAPLARSEPETTE_RESULT_TOO_SMALL", "small-list rejection");
  contains(adapter, "BOOK_INDEX_KITAPLARSEPETTE_DUPLICATE_PRODUCT_ID", "duplicate-id protection");
  contains(adapter, "BOOK_INDEX_KITAPLARSEPETTE_DETAIL_METADATA_MISSING", "minimum identity metadata gate");
  contains(
    sources,
    'baseUrl: "https://www.kitaplarsepette.com",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "ready",\n    independenceGroup: "iklim-grup",\n    operatorName: "İklim Grup Kitap Satış Dağıtım Ltd. Şti."',
    "KitaplarSepette independent source metadata",
  );
  contains(
    collector,
    "[kitaplarSepetteBookIndexAdapter.sourceCode, kitaplarSepetteBookIndexAdapter]",
    "KitaplarSepette adapter activation",
  );
  contains(lists, 'code: "kitaplarsepette-tr-live"', "live voter list registry");
  notContains(lists, 'code: "kitaplarsepette-tr-live-canary"', "canary registry retired after qualification");
  contains(lists, 'sourceUrl: "https://www.kitaplarsepette.com/cok-satanlar"', "canonical bestseller page");
  contains(lists, 'maxRank: 30', "bounded rank ceiling");
  contains(lists, 'collectionEveryMinutes: 360', "steady-state collection cadence");
  contains(lists, 'includeInComposite: true', "independent composite vote");
  contains(sources, "export const TURKEY_INDEX_MIN_SOURCES = 3;", "3-source threshold unchanged");
});


test("KitaplarSepette qualification evidence remains observable after voter activation", () => {
  const readiness = source("src/lib/book-index/readiness.ts");
  const lists = source("src/lib/book-index/lists.ts");

  contains(readiness, "kitaplarSepetteCanaryHealth", "retained canary health evidence");
  contains(readiness, "kitaplarSepetteCanaryShadowBookCount", "retained shadow book count");
  contains(readiness, "kitaplarSepetteCanaryShadowWouldReach3IndependentCount", "retained projected independent threshold evidence");
  contains(readiness, "kitaplarSepetteCanaryShadowSamples", "retained shadow overlap samples");
  contains(readiness, 'sourceCode !== "kitaplarsepette"', "shadow baseline excludes the activated storefront");
  contains(readiness, '"kitaplarsepette",', "shadow projection adds the qualified storefront once");
  contains(lists, 'code: "kitaplarsepette-tr-live"', "qualified live voter list");
  contains(lists, 'includeInComposite: true', "qualified composite vote");
});


test("Book Index admin shows independent-operator voting truth", () => {
  const admin = source("src/app/admin/kitap-endeksi/page.tsx");

  contains(admin, "1 bağımsız işletmeci grubu = 1 oy", "independent operator vote contract");
  notContains(admin, "<h2>1 kaynak = 1 oy</h2>", "stale storefront-vote copy removed");
  contains(admin, "readiness.observedCompositeIndependenceGroups", "independent operator count");
  contains(admin, "readiness.compositeIndependenceGroupTarget", "independent operator target");
  contains(admin, "readiness.booksOnAtLeast3IndependentCompositeSources", "3+ independent-book count");
  contains(admin, "<th>Bağımsız oy</th>", "preview independent-vote header");
});
