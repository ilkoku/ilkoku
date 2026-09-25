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

test("Turkey score normalizes rank and collapses duplicate source votes", () => {
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
    "minimum source eligibility gate",
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

test("foundation does not publish indexable bestseller routes before data readiness", () => {
  const sitemap = source("src/app/sitemap.ts");
  const contract = source("docs/BOOK_INDEX_V1.md");

  notContains(sitemap, "/en-cok-satanlar", "no premature bestseller sitemap");
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

test("book index collection stays admin-controlled before scheduler rollout", () => {
  const action = source("src/features/book-index/admin-actions.ts");
  const page = source("src/app/admin/kitap-endeksi/page.tsx");

  contains(action, 'admin.role !== "admin"', "admin-only manual collection");
  contains(action, "collectBookIndexListByCode", "manual collector action");
  contains(page, "Şimdi kontrol et", "manual source verification control");
  contains(page, "Otomatik scheduler bu aşamada kapalıdır", "scheduler remains off");
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
  contains(matching, "else if (externalBook.isbn10)", "ISBN-10 second matching");
  contains(matching, "normalizedTitle,\n        normalizedAuthor", "exact normalized title-author fallback");
  contains(matching, 'externalBook.matchStatus === "manual_matched"', "manual match preservation");
  contains(matching, 'externalBook.matchStatus === "rejected"', "manual rejection preservation");
  contains(matching, "if (candidates.length > 1)", "ambiguous title-author remains pending");
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

  contains(adapter, 'const MAX_BOOKS = 30;', "KitapSepeti Top 30 cap");
  contains(adapter, 'const MIN_EXPECTED_BOOKS = 20;', "KitapSepeti fail-closed minimum");
  contains(adapter, '\\sproduct-item', "product card selector");
  contains(adapter, '\\bproduct-title\\b', "title selector");
  contains(adapter, '\\bbrand-title\\b', "publisher selector");
  contains(adapter, '\\bmodel-title\\b', "author selector");
  contains(adapter, "BOOK_INDEX_KITAPSEPETI_RESULT_TOO_SMALL", "small result rejection");
  contains(adapter, "BOOK_INDEX_KITAPSEPETI_DUPLICATE_SOURCE_KEY", "duplicate source protection");
  contains(lists, 'code: "kitapsepeti-tr-live"', "KitapSepeti list registry");
  contains(lists, 'maxRank: 30', "KitapSepeti current-page rank cap");
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

  contains(adapter, 'const MAX_BOOKS = 20;', "Kitapzen Top 20 cap");
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

  contains(adapter, 'const MAX_BOOKS = 20;', "Inkilap Top 20 cap");
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
  notContains(sitemap, "/en-cok-satanlar", "no premature bestseller sitemap");
});
