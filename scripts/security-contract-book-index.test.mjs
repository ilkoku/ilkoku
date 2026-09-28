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
  contains(page, "Saatlik GitHub schedule tanımlıdır", "truthful scheduler configuration status");
  notContains(page, "Otomatik scheduler bu aşamada kapalıdır", "stale scheduler-off status removed");
});



test("BKM collector uses verified public bestseller feed and caps the V1 list at Top 100", () => {
  const bkm = source("src/lib/book-index/sources/bkm.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const sources = source("src/lib/book-index/sources.ts");

  contains(bkm, 'const ENDPOINT = "https://bkm-best.wawlabs.com/top_sellers";', "verified BKM feed");
  contains(bkm, 'case "bkm-tr-weekly"', "weekly span");
  contains(bkm, 'case "bkm-tr-monthly"', "monthly span");
  contains(bkm, 'case "bkm-tr-yearly"', "yearly span");
  contains(bkm, "const MAX_BOOKS = 100;", "Top 100 cap");
  contains(bkm, "const MIN_EXPECTED_BOOKS = 100;", "Top 100 fail-closed minimum");
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
    'code: "bkm-tr-weekly",\n    sourceCode: "bkm",\n    title: "BKM Kitap · Haftalık Çok Satanlar",\n    categoryKey: "general",\n    period: "weekly",\n    sourceUrl: "https://www.bkmkitap.com/cok-satan-kitaplar",\n    maxRank: 100,\n    includeInComposite: true',
    "weekly BKM composite vote",
  );
  contains(
    lists,
    'code: "bkm-tr-monthly",\n    sourceCode: "bkm",\n    title: "BKM Kitap · Aylık Çok Satanlar",\n    categoryKey: "general",\n    period: "monthly",\n    sourceUrl: "https://www.bkmkitap.com/cok-satan-kitaplar",\n    maxRank: 100,\n    includeInComposite: false',
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
  contains(adapter, "sourceKey: externalId", "idefix sourceKey remains the source variant id");
  contains(adapter, "DETAIL_CONCURRENCY = 6", "idefix detail enrichment stays bounded");
  contains(adapter, "parseIdefixProductDetails", "idefix detail metadata parser");
  contains(adapter, "ISBN-13", "idefix detail ISBN-13 extraction");
  contains(adapter, "detailAuthorName", "idefix detail author extraction");
  contains(
    adapter,
    "documentTitleAuthorName",
    "idefix document-title author fallback",
  );
  contains(
    adapter,
    "headingAuthorName",
    "idefix H1 author fallback",
  );
  contains(
    adapter,
    "books[index].title",
    "idefix H1 fallback is anchored to the list title",
  );
  contains(
    adapter,
    "expectedTitle = \"\"",
    "idefix detail parser accepts the verified list title as optional context",
  );
  contains(
    adapter,
    "identifiedBookCount",
    "idefix tracks successfully identified books after detail enrichment",
  );
  contains(
    adapter,
    "identifiedBookCount === 0",
    "idefix fails closed only when detail identity enrichment fully collapses",
  );
  contains(
    adapter,
    "BOOK_INDEX_IDEFIX_DETAIL_METADATA_MISSING",
    "idefix total identity loss remains fail closed",
  );
  notContains(
    adapter,
    "if (!authorName && !isbn13)",
    "one identity-poor book no longer rejects the entire idefix list",
  );
  contains(adapter, "books: await enrichBooks(parsed.books)", "idefix parsed books are enriched before persistence");
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

test("public Turkey table preserves source rank instead of inventing an İlkOku rank", () => {
  const sourceRankTable = source("src/lib/book-index/source-rank-table.ts");
  const publicModel = source("src/lib/book-index/public-read-model.ts");
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const rankTable = source("src/features/book-index/public/BookIndexRankTable.tsx");

  contains(
    sourceRankTable,
    "const rowKey = \`\${observation.rank}|\${identity}\`;",
    "same book is grouped only inside the same source rank",
  );
  contains(
    sourceRankTable,
    "current.sources.set(entry.list.source.code, {",
    "same-rank sources are combined on one row with source movement",
  );
  contains(
    sourceRankTable,
    "a.rank - b.rank",
    "public rows stay ordered by source rank",
  );
  contains(
    publicModel,
    "getTurkeySourceRankRows(limit)",
    "public model uses source-rank rows",
  );
  contains(rankTable, '<th scope="col">Sıra</th>', "plain Turkish rank heading");
  contains(rankTable, '<th scope="col">Kaynak</th>', "source heading");
  contains(rankTable, "const showRank = !previousRow || previousRow.rank !== row.rank;", "repeated visible rank labels collapse by rank group");
  contains(
    rankTable,
    'row.sources.map((source) => source.sourceName).join(" · ")',
    "same-rank source names shown together",
  );
  notContains(`${view}\n${rankTable}`, "İlkOku Sırası", "no invented İlkOku public rank");
  notContains(rankTable, "<th scope=\"col\">Kaynak Sayısı</th>", "no composite source-count column");
  contains(rankTable, '<th scope="col">Hareket</th>', "source-rank movement heading");
  contains(rankTable, "rowMovementLabel(row)", "movement is rendered from source snapshot history");
  contains(rankTable, "styles.rankGroupStart", "rank changes render a visual group separator");
});


test("Book Index public pages expose source-rank filters and overview keeps complete ranks 1-3", () => {
  const rankTable = source("src/features/book-index/public/BookIndexRankTable.tsx");
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const overview = source("src/app/en-cok-satanlar/page.tsx");

  contains(rankTable, 'type="search"', "book/author search filter");
  contains(rankTable, "<span>Kaynak</span>", "source filter");
  contains(rankTable, "<span>Sıra</span>", "rank filter");
  contains(rankTable, "Tüm kaynaklar", "all-source option");
  contains(rankTable, "Tüm sıralar", "all-rank option");
  contains(rankTable, "setQuery(\"\")", "filter reset");
  contains(
    rankTable,
    "rows.filter((row) => row.rank <= maxRank)",
    "rank-group preview keeps all rows inside the requested ranks",
  );
  contains(
    view,
    "<BookIndexRankTable rows={model.turkey.items} maxRank={3} />",
    "overview renders complete source ranks 1 through 3",
  );
  contains(
    view,
    "<BookIndexRankTable rows={model.turkey.items} />",
    "Turkey page exposes the full filterable table",
  );
  contains(
    overview,
    "context.model.turkey.items.filter((item) => item.rank <= 3)",
    "overview structured data matches the visible first three rank groups",
  );
});

test("KitapSepeti collector parses the verified server-rendered bestseller catalog", () => {
  const adapter = source("src/lib/book-index/sources/kitapsepeti.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(adapter, 'const MAX_BOOKS = 100;', "KitapSepeti Top 100 cap");
  contains(adapter, 'const PAGE_COUNT = 4;', "four verified native bestseller pages");
  contains(adapter, 'url.searchParams.set("pg", String(page))', "verified native pg pagination");
  contains(adapter, 'const MIN_EXPECTED_BOOKS = 20;', "KitapSepeti per-page fail-closed minimum");
  contains(adapter, '\\sproduct-item', "product card selector");
  contains(adapter, '\\bproduct-title\\b', "title selector");
  contains(adapter, '\\bbrand-title\\b', "publisher selector");
  contains(adapter, '\\bmodel-title\\b', "author selector");
  contains(adapter, "BOOK_INDEX_KITAPSEPETI_RESULT_TOO_SMALL", "small result rejection");
  contains(adapter, "BOOK_INDEX_KITAPSEPETI_DUPLICATE_SOURCE_KEY", "duplicate source protection");
  contains(lists, 'code: "kitapsepeti-tr-live"', "KitapSepeti list registry");
  contains(lists, 'maxRank: 100', "KitapSepeti Top 100 rank ceiling");
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
  contains(adapter, 'const PAGINATED_LIST_CODES = new Set([', "Kitapzen paginated period registry");
  contains(adapter, '"kitapzen-tr-weekly"', "Kitapzen weekly uses native pagination");
  contains(adapter, '"kitapzen-tr-monthly"', "Kitapzen monthly uses native pagination");
  contains(adapter, '"kitapzen-tr-yearly"', "Kitapzen yearly uses native pagination");
  contains(adapter, 'data-prd-barcode', "Kitapzen ISBN source");
  contains(adapter, '\\bProduct_b\\b', "Kitapzen product card selector");
  contains(adapter, '\\bwriter\\b', "Kitapzen author selector");
  contains(adapter, '\\bpublisher\\b', "Kitapzen publisher selector");
  contains(adapter, "BOOK_INDEX_KITAPZEN_RESULT_TOO_SMALL", "Kitapzen suspicious result rejection");
  contains(adapter, "BOOK_INDEX_KITAPZEN_DUPLICATE_SOURCE_KEY", "Kitapzen duplicate protection");
  contains(lists, 'code: "kitapzen-tr-weekly"', "Kitapzen weekly list");
  contains(lists, 'code: "kitapzen-tr-monthly"', "Kitapzen monthly list");
  contains(lists, 'code: "kitapzen-tr-yearly"', "Kitapzen yearly list");
  for (const listCode of ["kitapzen-tr-weekly", "kitapzen-tr-monthly", "kitapzen-tr-yearly"]) {
    const marker = `code: "${listCode}"`;
    const start = lists.indexOf(marker);
    assert.ok(start >= 0, `missing Kitapzen list: ${listCode}`);
    const end = lists.indexOf("\n  },", start);
    const block = lists.slice(start, end);
    contains(block, "maxRank: 100", `${listCode} keeps Top 100 rank ceiling`);
  }
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

test("KitapSec category and general collectors preserve bounded native ranks", () => {
  const adapter = source("src/lib/book-index/sources/kitapsec.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(adapter, 'const CATEGORY_MAX_BOOKS = 48;', "KitapSec category page cap");
  contains(adapter, 'const GENERAL_MAX_BOOKS = 56;', "KitapSec general page cap");
  contains(adapter, 'const GENERAL_CANARY_MAX_RANK = 100;', "KitapSec general canary Top 100 cap");
  contains(adapter, 'const GENERAL_CANARY_PAGE_COUNT = 2;', "KitapSec general canary two-page bound");
  contains(adapter, "generalPageUrl(sourceUrl, page)", "KitapSec general canary follows native pagination");
  contains(adapter, "pageIndex * GENERAL_MAX_BOOKS", "KitapSec page-local ranks use deterministic page offset");
  contains(adapter, "BOOK_INDEX_KITAPSEC_GENERAL_CROSS_PAGE_DUPLICATE", "KitapSec cross-page duplicates fail closed");
  contains(adapter, 'const CATEGORY_MIN_EXPECTED_BOOKS = 20;', "KitapSec category fail-closed minimum");
  contains(adapter, 'const GENERAL_MIN_EXPECTED_BOOKS = 40;', "KitapSec general fail-closed minimum");
  contains(adapter, '\\bKs_ContentUrunList\\b', "KitapSec canonical list scope");
  contains(adapter, '\\burunListeleDiv\\b', "KitapSec stable list container");
  contains(adapter, '\\bKs_UrunSatir\\b', "KitapSec ranked card selector");
  contains(adapter, 'itemprop=["\']position', "KitapSec explicit rank metadata");
  contains(adapter, 'itemprop=["\']sku', "KitapSec ISBN metadata");
  contains(adapter, "parseKitapSecGeneralBestsellers", "KitapSec bounded general parser");
  contains(adapter, "GENERAL_LIST_CODES", "KitapSec general list routing");
  contains(adapter, "CATEGORY_LIST_CODES", "KitapSec category list routing");
  contains(adapter, "BOOK_INDEX_KITAPSEC_LIST_NOT_SUPPORTED", "KitapSec unknown-list rejection");
  contains(adapter, 'new TextDecoder("windows-1254")', "KitapSec source encoding");
  contains(adapter, "BOOK_INDEX_KITAPSEC_LIST_NOT_FOUND", "KitapSec list scope failure");
  contains(adapter, "BOOK_INDEX_KITAPSEC_RESULT_TOO_SMALL", "KitapSec suspicious result rejection");
  contains(adapter, "BOOK_INDEX_KITAPSEC_RANK_SEQUENCE_INVALID", "KitapSec rank continuity validation");
  contains(adapter, "BOOK_INDEX_KITAPSEC_DUPLICATE_ITEM", "KitapSec duplicate rank/source protection");
  contains(
    adapter,
    'const VERIFIED_GENERAL_NON_BOOK_PRODUCT_IDS = new Set(["712938"]);',
    "KitapSec exact verified general non-book exclusion",
  );
  contains(
    adapter,
    "excludedProductIds: VERIFIED_GENERAL_NON_BOOK_PRODUCT_IDS",
    "KitapSec exclusion applies only to general parser",
  );
  contains(
    adapter,
    '!excludedProductIds.has(book.sourceExternalId ?? "")',
    "KitapSec preserves native ranks after exact exclusion",
  );

  contains(lists, 'code: "kitapsec-edebiyat-live"', "KitapSec Edebiyat list");
  contains(lists, 'categoryKey: "edebiyat"', "KitapSec category scope");
  contains(
    lists,
    'code: "kitapsec-cocuk-genclik-live",\n    sourceCode: "kitapsec",\n    title: "KitapSeç · Çocuk ve Gençlik Çok Satan Kitaplar",\n    categoryKey: "cocuk-genclik",\n    period: "live",\n    sourceUrl: "https://www.kitapsec.com/Products/Cocuk-ve-Genclik-Kitaplari/Cok-Satan-Kitaplar/",\n    maxRank: 48,\n    includeInComposite: false',
    "KitapSec child and youth category list",
  );
  contains(
    lists,
    'code: "kitapsec-general-live",\n    sourceCode: "kitapsec",\n    title: "KitapSeç · Genel Çok Satanlar",\n    categoryKey: "general",\n    period: "live",\n    sourceUrl: "https://www.kitapsec.com/Cok-Satanlar/1-6-0a0-0-0-0-0-0-4.xhtml",\n    maxRank: 56,\n    includeInComposite: false,\n    collectionEveryMinutes: null,\n    publiclyVisible: false,\n    enabled: false',
    "KitapSec general voter remains disabled",
  );
  contains(
    lists,
    'code: "kitapsec-general-live-canary",\n    sourceCode: "kitapsec",\n    title: "KitapSeç · Genel Çok Satanlar · Canary",\n    categoryKey: "general",\n    period: "live",\n    sourceUrl: "https://www.kitapsec.com/Cok-Satanlar/1-6-0a0-0-0-0-0-0-4.xhtml",\n    maxRank: 100,\n    includeInComposite: false,\n    collectionEveryMinutes: 360,\n    publiclyVisible: false,\n    enabled: true',
    "KitapSec general shadow canary",
  );
  contains(collector, "[kitapSecBookIndexAdapter.sourceCode, kitapSecBookIndexAdapter]", "KitapSec adapter activation");
  contains(
    sources,
    'baseUrl: "https://www.kitapsec.com",\n    includeInTurkeyIndex: true,\n    independenceGroup: "kitapsec",\n    operatorName: "KİTAPSEÇ YAYINCILIK ELEKTRONİK NAKLİYE MAKİNA İNŞAAT TAAHHÜT SANAYİ VE TİCARET LİMİTED ŞİRKETİ",\n    phase: "phase_2",\n    collectionState: "ready"',
    "KitapSec source/operator contract",
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
  contains(lists, 'maxRank: 100', "expanded composite rank ceiling");
  contains(kitapzen, "for (let page = 1; page <= 5; page += 1)", "Kitapzen first five native pages");
  contains(kitapzen, '(page - 1) * MAX_BOOKS', "Kitapzen contiguous native rank offsets");
  contains(inkilap, "for (let page = 1; page <= 5; page += 1)", "Inkilap first five native pages");
  contains(inkilap, '/sayfa/${page}', "Inkilap native pagination path");
  contains(inkilap, '(page - 1) * MAX_BOOKS', "Inkilap contiguous native rank offsets");
  contains(kitapsepeti, 'const MAX_BOOKS = 100;', "KitapSepeti bounded Top 100 target");
  contains(kitapsepeti, 'const PAGE_COUNT = 4;', "KitapSepeti first four verified native pages");
  contains(kitapsepeti, 'url.searchParams.set("pg", String(page))', "KitapSepeti native pagination query");
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

  contains(adapter, 'const MAX_BOOKS = 100;', "bounded KitaplarSepette Top 100");
  contains(adapter, 'const PAGE_SIZE = 30;', "source-native page size");
  contains(adapter, 'const MAX_PAGES = Math.ceil(MAX_BOOKS / PAGE_SIZE);', "bounded page count");
  contains(adapter, 'url.searchParams.set("sayfa", String(page))', "source-native pagination");
  contains(adapter, "BOOK_INDEX_KITAPLARSEPETTE_PAGINATION_GAP", "pagination gap rejection");
  contains(adapter, "cards.length < PAGE_SIZE", "short page terminates native pagination");
  contains(adapter, 'const MIN_EXPECTED_BOOKS = 60;', "fail-closed multi-page minimum");
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
  contains(lists, 'maxRank: 100', "bounded rank ceiling");
  contains(lists, 'collectionEveryMinutes: 360', "steady-state collection cadence");
  contains(lists, 'includeInComposite: true', "independent composite vote");
  contains(sources, "export const TURKEY_INDEX_MIN_SOURCES = 3;", "3-source threshold unchanged");
});


test("KitapStore qualification evidence remains observable after voter activation", () => {
  const readiness = source("src/lib/book-index/readiness.ts");
  const route = source("src/app/api/internal/book-index-readiness/route.ts");
  const workflow = source(".github/workflows/book-index-readiness.yml");
  const lists = source("src/lib/book-index/lists.ts");

  contains(readiness, "kitapStoreCanaryHealth", "KitapStore canary health evidence");
  contains(readiness, "kitapStoreCanaryObservationCount", "KitapStore canary observation count");
  contains(readiness, "kitapStoreCanaryMatchedObservationCount", "KitapStore matched observation count");
  contains(readiness, "kitapStoreCanaryUnmatchedObservationCount", "KitapStore unmatched observation count");
  contains(readiness, "kitapStoreCanaryDuplicateMasterObservationCount", "KitapStore duplicate-master observation count");
  contains(readiness, "kitapStoreCanaryDuplicateMasterSamples", "KitapStore duplicate-master samples");
  contains(readiness, "kitapStoreCanaryShadowBookCount", "KitapStore shadow book count");
  contains(readiness, "kitapStoreCanaryShadowOverlapWithCompositeCount", "KitapStore overlap evidence");
  contains(readiness, "kitapStoreCanaryShadowWouldReach3StorefrontCount", "KitapStore projected storefront threshold");
  contains(readiness, "kitapStoreCanaryShadowWouldReach3IndependentCount", "KitapStore projected independent threshold");
  contains(readiness, "kitapStoreCanaryShadowPairOverlap", "KitapStore pair-overlap evidence");
  contains(readiness, "kitapStoreCanaryShadowSamples", "KitapStore shadow overlap samples");
  contains(readiness, 'sourceCode !== "kitapstore"', "shadow baseline excludes KitapStore");
  contains(readiness, '"kitapstore",', "shadow projection adds KitapStore once");

  contains(route, "readiness.kitapStoreCanaryHealth", "readiness API exposes canary health");
  contains(route, "readiness.kitapStoreCanaryObservationCount", "readiness API exposes observation count");
  contains(route, "readiness.kitapStoreCanaryMatchedObservationCount", "readiness API exposes matched observation count");
  contains(route, "readiness.kitapStoreCanaryUnmatchedObservationCount", "readiness API exposes unmatched observation count");
  contains(route, "readiness.kitapStoreCanaryDuplicateMasterObservationCount", "readiness API exposes duplicate-master observation count");
  contains(route, "readiness.kitapStoreCanaryDuplicateMasterSamples", "readiness API exposes duplicate-master samples");
  contains(route, "readiness.kitapStoreCanaryShadowBookCount", "readiness API exposes shadow book count");
  contains(route, "readiness.kitapStoreCanaryShadowWouldReach3IndependentCount", "readiness API exposes independent projection");
  contains(route, "readiness.kitapStoreCanaryShadowSamples", "readiness API exposes shadow samples");

  contains(workflow, '"kitapStoreCanaryHealth": readiness.get("kitapStoreCanaryHealth")', "passive observer prints canary health");
  contains(workflow, '"kitapStoreCanaryObservationCount": readiness.get("kitapStoreCanaryObservationCount")', "passive observer prints observation count");
  contains(workflow, '"kitapStoreCanaryDuplicateMasterObservationCount": readiness.get("kitapStoreCanaryDuplicateMasterObservationCount")', "passive observer prints duplicate-master observation count");
  contains(workflow, '"kitapStoreCanaryDuplicateMasterSamples": readiness.get("kitapStoreCanaryDuplicateMasterSamples")', "passive observer prints duplicate-master samples");
  contains(workflow, '"kitapStoreCanaryShadowWouldReach3IndependentCount": readiness.get("kitapStoreCanaryShadowWouldReach3IndependentCount")', "passive observer prints independent projection");
  contains(workflow, '"kitapStoreCanaryShadowSamples": readiness.get("kitapStoreCanaryShadowSamples")', "passive observer prints shadow samples");

  contains(lists, 'code: "kitapstore-tr-live-canary"', "KitapStore historical canary registry");
  const voterMarker = 'code: "kitapstore-tr-live"';
  const voterStart = lists.indexOf(voterMarker);
  const voterEnd = lists.indexOf("\n  },", voterStart);
  const voterBlock = lists.slice(voterStart, voterEnd);
  contains(voterBlock, "maxRank: 100", "KitapStore voter keeps verified Top 100 bound");
  contains(voterBlock, "includeInComposite: true", "KitapStore voter contributes to Turkey composite");
  contains(voterBlock, "collectionEveryMinutes: 360", "KitapStore voter keeps qualified cadence");
  contains(voterBlock, "enabled: true", "KitapStore voter is active");
  const canaryMarker = 'code: "kitapstore-tr-live-canary"';
  const canaryStart = lists.indexOf(canaryMarker);
  const canaryEnd = lists.indexOf("\n  },", canaryStart);
  const canaryBlock = lists.slice(canaryStart, canaryEnd);
  contains(canaryBlock, "includeInComposite: false", "KitapStore canary never votes");
  contains(canaryBlock, "collectionEveryMinutes: null", "KitapStore canary stops new collection after promotion");
  contains(canaryBlock, "enabled: false", "KitapStore canary is retired after promotion");
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


test("KitapSec general shadow canary qualification evidence is observable without voting", () => {
  const readiness = source("src/lib/book-index/readiness.ts");
  const route = source("src/app/api/internal/book-index-readiness/route.ts");
  const workflow = source(".github/workflows/book-index-readiness.yml");
  const lists = source("src/lib/book-index/lists.ts");

  contains(readiness, "kitapSecGeneralCanaryHealth", "KitapSec canary health evidence");
  contains(readiness, "kitapSecGeneralCanaryShadowBookCount", "KitapSec shadow book count");
  contains(
    readiness,
    "kitapSecGeneralCanaryShadowWouldReach3IndependentCount",
    "KitapSec projected independent threshold evidence",
  );
  contains(readiness, "kitapSecGeneralCanaryShadowPairOverlap", "KitapSec pair-overlap evidence");
  contains(readiness, "kitapSecGeneralCanaryShadowSamples", "KitapSec shadow overlap samples");
  contains(readiness, 'sourceCode !== "kitapsec"', "shadow baseline excludes KitapSec");
  contains(readiness, '"kitapsec",', "shadow projection adds KitapSec once");

  contains(route, "readiness.kitapSecGeneralCanaryHealth", "readiness API exposes KitapSec canary health");
  contains(
    route,
    "readiness.kitapSecGeneralCanaryShadowWouldReach3IndependentCount",
    "readiness API exposes KitapSec independent projection",
  );
  contains(
    workflow,
    '"kitapSecGeneralCanaryHealth": readiness.get("kitapSecGeneralCanaryHealth")',
    "passive observer prints KitapSec canary health",
  );
  contains(
    workflow,
    '"kitapSecGeneralCanaryShadowWouldReach3IndependentCount": readiness.get("kitapSecGeneralCanaryShadowWouldReach3IndependentCount")',
    "passive observer prints KitapSec independent projection",
  );

  contains(lists, 'code: "kitapsec-general-live-canary"', "KitapSec general shadow canary list");
  contains(lists, 'code: "kitapsec-general-live"', "KitapSec general voter registry");
  contains(
    lists,
    'code: "kitapsec-general-live",\n    sourceCode: "kitapsec",\n    title: "KitapSeç · Genel Çok Satanlar",\n    categoryKey: "general",\n    period: "live",\n    sourceUrl: "https://www.kitapsec.com/Cok-Satanlar/1-6-0a0-0-0-0-0-0-4.xhtml",\n    maxRank: 56,\n    includeInComposite: false,\n    collectionEveryMinutes: null,\n    publiclyVisible: false,\n    enabled: false',
    "KitapSec general voter remains disabled",
  );
});



test("Book Index readiness waits for main CI before probing production", () => {
  const route = source("src/app/api/internal/book-index-readiness/route.ts");
  const workflow = source(".github/workflows/book-index-readiness.yml");

  contains(workflow, "workflow_run:", "readiness uses workflow_run trigger");
  contains(workflow, "- CI", "readiness waits for CI workflow");
  contains(workflow, "types:\n      - completed", "readiness waits for completed CI");
  notContains(workflow, "  push:\n", "readiness does not race production on push");
  contains(route, '"workflow_run"', "OIDC route authorizes workflow_run readiness probes");
});


test("Pandora qualification evidence remains observable after voter activation", () => {
  const readiness = source("src/lib/book-index/readiness.ts");
  const route = source("src/app/api/internal/book-index-readiness/route.ts");
  const workflow = source(".github/workflows/book-index-readiness.yml");
  const lists = source("src/lib/book-index/lists.ts");

  contains(readiness, "pandoraCanaryHealth", "Pandora canary health evidence");
  contains(readiness, "pandoraCanaryShadowBookCount", "Pandora shadow book count");
  contains(readiness, "pandoraCanaryShadowOverlapWithCompositeCount", "Pandora overlap evidence");
  contains(readiness, "pandoraCanaryShadowWouldReach3StorefrontCount", "Pandora projected storefront threshold");
  contains(readiness, "pandoraCanaryShadowWouldReach3IndependentCount", "Pandora projected independent threshold");
  contains(readiness, "pandoraCanaryShadowPairOverlap", "Pandora pair-overlap evidence");
  contains(readiness, "pandoraCanaryShadowSamples", "Pandora shadow overlap samples");
  contains(readiness, 'sourceCode !== "pandora"', "shadow baseline excludes Pandora");
  contains(readiness, '"pandora",', "shadow projection adds Pandora once");

  contains(route, "readiness.pandoraCanaryHealth", "readiness API exposes Pandora canary health");
  contains(
    route,
    "readiness.pandoraCanaryShadowWouldReach3IndependentCount",
    "readiness API exposes Pandora independent projection",
  );
  contains(
    workflow,
    '"pandoraCanaryHealth": readiness.get("pandoraCanaryHealth")',
    "passive observer prints Pandora canary health",
  );
  contains(
    workflow,
    '"pandoraCanaryShadowWouldReach3IndependentCount": readiness.get("pandoraCanaryShadowWouldReach3IndependentCount")',
    "passive observer prints Pandora independent projection",
  );

  contains(lists, 'code: "pandora-tr-live-canary"', "Pandora shadow canary list");
  contains(lists, 'code: "pandora-tr-live"', "Pandora voter registry");
  const marker = 'code: "pandora-tr-live"';
  const start = lists.indexOf(marker);
  const end = lists.indexOf("\n  },", start);
  const voterBlock = lists.slice(start, end);
  contains(voterBlock, "maxRank: 50", "Pandora voter keeps verified native bound");
  contains(voterBlock, "includeInComposite: true", "Pandora voter contributes to Turkey composite");
  contains(voterBlock, "collectionEveryMinutes: 360", "Pandora voter keeps qualified cadence");
  contains(voterBlock, "enabled: true", "Pandora voter is active");
});

test("Kitap Ambari canary qualification evidence is observable while voter stays off", () => {
  const readiness = source("src/lib/book-index/readiness.ts");
  const route = source("src/app/api/internal/book-index-readiness/route.ts");
  const workflow = source(".github/workflows/book-index-readiness.yml");
  const lists = source("src/lib/book-index/lists.ts");

  contains(readiness, "kitapAmbariCanaryHealth", "Kitap Ambari canary health evidence");
  contains(readiness, "kitapAmbariCanaryShadowBookCount", "Kitap Ambari shadow book count");
  contains(readiness, "kitapAmbariCanaryShadowOverlapWithCompositeCount", "Kitap Ambari overlap evidence");
  contains(readiness, "kitapAmbariCanaryShadowWouldReach3StorefrontCount", "Kitap Ambari projected storefront threshold");
  contains(readiness, "kitapAmbariCanaryShadowWouldReach3IndependentCount", "Kitap Ambari projected independent threshold");
  contains(readiness, "kitapAmbariCanaryShadowPairOverlap", "Kitap Ambari pair-overlap evidence");
  contains(readiness, "kitapAmbariCanaryShadowSamples", "Kitap Ambari shadow overlap samples");
  contains(readiness, 'sourceCode !== "kitapambari"', "Kitap Ambari shadow baseline excludes itself");
  contains(readiness, '"kitapambari",', "Kitap Ambari shadow projection adds source once");

  contains(route, "readiness.kitapAmbariCanaryHealth", "readiness API exposes Kitap Ambari canary health");
  contains(route, "readiness.kitapAmbariCanaryShadowWouldReach3IndependentCount", "readiness API exposes Kitap Ambari independent projection");
  contains(route, "readiness.kitapAmbariCanaryShadowSamples", "readiness API exposes Kitap Ambari shadow samples");

  contains(workflow, '"kitapAmbariCanaryHealth": readiness.get("kitapAmbariCanaryHealth")', "passive observer prints Kitap Ambari health");
  contains(workflow, '"kitapAmbariCanaryShadowWouldReach3IndependentCount": readiness.get("kitapAmbariCanaryShadowWouldReach3IndependentCount")', "passive observer prints Kitap Ambari independent projection");

  contains(lists, 'code: "kitapambari-tr-live-canary"', "Kitap Ambari canary registry");
  contains(lists, 'includeInComposite: false', "Kitap Ambari canary remains outside composite");
  contains(lists, 'code: "kitapambari-tr-live"', "Kitap Ambari voter registry remains separate");
  contains(lists, 'enabled: false', "Kitap Ambari voter remains disabled");
});



test("Book Index public read model excludes shadow, research and disabled candidate lists", () => {
  const lists = source("src/lib/book-index/lists.ts");
  const publicReadModel = source("src/lib/book-index/public-read-model.ts");

  contains(lists, "publiclyVisible: boolean;", "list registry has explicit public visibility");
  contains(
    publicReadModel,
    "list.enabled && list.publiclyVisible",
    "public model requires enabled and explicitly public lists",
  );

  for (const listCode of [
    "kitapsec-general-live",
    "kitapsec-general-live-canary",
    "kitapstore-tr-live-canary",
    "pandora-tr-live-canary",
    "kitapambari-tr-live",
    "amazon-tr-live",
  ]) {
    const marker = `code: "${listCode}"`;
    const start = lists.indexOf(marker);
    assert.ok(start >= 0, `missing list definition: ${listCode}`);
    const end = lists.indexOf("\n  },", start);
    assert.ok(end > start, `invalid list definition block: ${listCode}`);
    const block = lists.slice(start, end);
    contains(block, "publiclyVisible: false", `${listCode} stays private`);
  }

  for (const listCode of [
    "remzi-tr-weekly",
    "bkm-tr-weekly",
    "kitapsepeti-tr-live",
    "kitaplarsepette-tr-live",
    "kitapzen-tr-weekly",
    "inkilap-tr-live",
    "illakitap-tr-weekly",
    "nobelkitap-tr-live",
    "idefix-tr-live",
    "pandora-tr-live",
    "kitapstore-tr-live",
  ]) {
    const marker = `code: "${listCode}"`;
    const start = lists.indexOf(marker);
    assert.ok(start >= 0, `missing public list definition: ${listCode}`);
    const end = lists.indexOf("\n  },", start);
    assert.ok(end > start, `invalid public list definition block: ${listCode}`);
    const block = lists.slice(start, end);
    contains(block, "publiclyVisible: true", `${listCode} remains public-eligible`);
  }
});

test("Book Index admin reflects independent-operator voting", () => {
  const admin = source("src/app/admin/kitap-endeksi/page.tsx");

  contains(admin, "1 bağımsız işletmeci grubu = 1 oy", "independent operator vote contract");
  notContains(admin, "<h2>1 kaynak = 1 oy</h2>", "stale storefront vote copy removed");
  contains(admin, "readiness.observedCompositeIndependenceGroups", "independent operator count");
  contains(admin, "readiness.compositeIndependenceGroupTarget", "independent operator target");
  contains(admin, "readiness.booksOnAtLeast3IndependentCompositeSources", "3+ independent-book count");
  contains(admin, "Saatlik GitHub schedule tanımlıdır", "truthful scheduler status copy");
  notContains(admin, "Otomatik scheduler bu aşamada kapalıdır", "stale scheduler-off copy removed");
  notContains(admin, "Saatlik scheduler aktif", "scheduler delivery is not overstated");
});


test("Book Index readiness diagnoses missing authors among unmatched records without mutating matching", () => {
  const readiness = source("src/lib/book-index/readiness.ts");
  const admin = source("src/app/admin/kitap-endeksi/page.tsx");
  const matching = source("src/lib/book-index/matching.ts");

  contains(
    readiness,
    "unmatchedMissingAuthorBooksBySource",
    "source-level unmatched missing-author count",
  );
  contains(
    readiness,
    "unmatchedMissingAuthorSamples",
    "bounded unmatched missing-author samples",
  );
  contains(
    readiness,
    "normalizedAuthor: null",
    "missing-author diagnostic is scoped to normalized author absence",
  );
  contains(
    readiness,
    'matchStatus: "unmatched"',
    "missing-author diagnostic remains unmatched-only",
  );
  contains(
    admin,
    "Yazar bilgisi eksik unmatched",
    "admin exposes missing-author evidence",
  );
  contains(
    readiness,
    "unmatchedAmbiguousIdentityGroupCount",
    "ambiguous unmatched identity count",
  );
  contains(
    readiness,
    "unmatchedAmbiguousIdentitySamples",
    "bounded ambiguous unmatched identity samples",
  );
  contains(
    admin,
    "Belirsiz master adayı",
    "admin exposes ambiguous-master evidence",
  );
  notContains(
    matching,
    "unmatchedMissingAuthor",
    "missing-author diagnostic does not alter matching behavior",
  );
  notContains(
    matching,
    "unmatchedAmbiguousIdentity",
    "ambiguous-master diagnostic does not alter matching behavior",
  );
});


test("Book Index source adapters exclude only verified non-book catalogue entries", () => {
  const illakitap = source("src/lib/book-index/sources/illakitap.ts");
  const kitapsepeti = source("src/lib/book-index/sources/kitapsepeti.ts");

  contains(
    illakitap,
    'const VERIFIED_NON_BOOK_PRODUCT_IDS = new Set(["941554"]);',
    "verified İlla Kitap periodical exclusion",
  );
  contains(
    illakitap,
    "VERIFIED_NON_BOOK_PRODUCT_IDS.has(productId)",
    "İlla Kitap exclusion uses stable source product id",
  );
  contains(
    kitapsepeti,
    "const VERIFIED_NON_BOOK_SOURCE_KEYS = new Set([",
    "verified KitapSepeti exact non-book exclusion set",
  );
  for (const sourceKey of [
    "/3-in-1-puzzle",
    "/ntt-magnum-jel-kalem-hediyeli-6-li-defter-love",
    "/ntt-magnum-jel-kalem-hediyeli-6-li-defter-geometri",
    "/kuromi-1006-10-renk-tukenmez-kalem",
    "/note-the-time-2li-defter-set-soft-pastel-buyuk-ve-kucuk-cizgisiz",
    "/kenko-kk-613d-dijital-kucuk-masa-araba-saati-alarm-kronometre",
    "/canli-cicek-kitap-ayraci",
  ]) {
    contains(
      kitapsepeti,
      `"${sourceKey}"`,
      `verified KitapSepeti non-book exclusion: ${sourceKey}`,
    );
  }
  contains(
    kitapsepeti,
    "VERIFIED_NON_BOOK_SOURCE_KEYS.has(href)",
    "KitapSepeti exclusion uses stable source key",
  );
  notContains(
    illakitap,
    'title.includes("Dergi")',
    "İlla Kitap does not broadly exclude books by title word",
  );
  notContains(
    kitapsepeti,
    'title.toLowerCase().includes("puzzle")',
    "KitapSepeti does not broadly exclude books by title word",
  );
  contains(
    illakitap,
    ".map((book, index) => ({",
    "İlla Kitap reranks eligible books after exclusions",
  );
  contains(
    kitapsepeti,
    ".map((book, index) => ({",
    "KitapSepeti reranks eligible books after exclusions",
  );
});


test("Amazon TR research parser remains fail-closed and production-disabled", () => {
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const amazon = source("src/lib/book-index/sources/amazon-tr.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(
    sources,
    'code: "amazon-tr"',
    "Amazon TR source registry entry",
  );
  contains(
    sources,
    'name: "Amazon Türkiye",\n    market: "TR",\n    countryCode: "TR",\n    baseUrl: "https://www.amazon.com.tr",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "researching"',
    "Amazon TR remains researching",
  );
  contains(lists, 'code: "amazon-tr-live"', "Amazon TR research list");
  contains(
    lists,
    'sourceUrl: "https://www.amazon.com.tr/gp/bestsellers/books",\n    maxRank: null,\n    includeInComposite: false,\n    collectionEveryMinutes: 360,\n    publiclyVisible: false,\n    enabled: false',
    "Amazon TR research list stays disabled and outside composite",
  );
  contains(amazon, 'data-asin=["\']([^"\']+)["\']', "ASIN source identity");
  contains(amazon, "\\bzg-bdg-text\\b", "Amazon native rank badge");
  contains(
    amazon,
    "BOOK_INDEX_AMAZON_TR_PAGE_RANK_GAP",
    "page-level rank-gap guard",
  );
  contains(
    amazon,
    "BOOK_INDEX_AMAZON_TR_RANK_GAP",
    "cross-page rank-gap guard",
  );
  contains(
    amazon,
    "BOOK_INDEX_AMAZON_TR_DUPLICATE_SOURCE_KEY",
    "duplicate ASIN guard",
  );
  contains(
    amazon,
    '"User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)"',
    "transparent collector user agent",
  );
  contains(amazon, "AbortSignal.timeout(20_000)", "bounded Amazon requests");
  notContains(
    collector,
    "amazonTrBookIndexResearchAdapter",
    "research adapter is not production-registered",
  );
});


test("Pandora source is fail-closed and promoted to Turkey composite", () => {
  const adapter = source("src/lib/book-index/sources/pandora.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(
    adapter,
    'const API_URL = "https://www.pandora.com.tr/api/coksatanlar";',
    "Pandora first-party bestseller API",
  );
  contains(adapter, "const EXPECTED_NATIVE_ROWS = 50;", "Pandora exact native slot contract");
  contains(adapter, "rank !== index + 1", "Pandora native rank continuity");
  contains(adapter, "BOOK_INDEX_PANDORA_PRODUCT_ID_COLLISION", "Pandora product collision guard");
  contains(adapter, "BOOK_INDEX_PANDORA_ISBN_COLLISION", "Pandora ISBN collision guard");
  contains(adapter, "Keep the first/best native rank", "exact duplicate keeps native best rank");
  contains(adapter, "never renumber", "duplicate collapse never invents ranks");
  contains(adapter, '"User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)"', "transparent Pandora user agent");
  contains(adapter, "AbortSignal.timeout(20_000)", "bounded Pandora request");

  contains(
    sources,
    'name: "Pandora Kitabevi",\n    market: "TR",\n    countryCode: "TR",\n    baseUrl: "https://www.pandora.com.tr",\n    includeInTurkeyIndex: true,\n    independenceGroup: "pandora",\n    operatorName: "Pandora Yayın ve Kitap Hizmetleri A.Ş.",\n    phase: "phase_2",\n    collectionState: "ready"',
    "Pandora adapter is ready for production collection",
  );

  contains(
    lists,
    'code: "pandora-tr-live",\n    sourceCode: "pandora",\n    title: "Pandora Kitabevi · Çok Satanlar · Türkçe",\n    categoryKey: "general",\n    period: "live",\n    sourceUrl: "https://www.pandora.com.tr/Cok_Satan_Kitaplar",\n    maxRank: 50,\n    includeInComposite: true,\n    collectionEveryMinutes: 360,\n    publiclyVisible: true,\n    enabled: true',
    "Pandora voter is active in the Turkey composite",
  );

  contains(
    lists,
    'code: "pandora-tr-live-canary",\n    sourceCode: "pandora",\n    title: "Pandora Kitabevi · Çok Satanlar · Türkçe · Canary",\n    categoryKey: "general",\n    period: "live",\n    sourceUrl: "https://www.pandora.com.tr/Cok_Satan_Kitaplar",\n    maxRank: 50,\n    includeInComposite: false,\n    collectionEveryMinutes: null,\n    publiclyVisible: false,\n    enabled: false',
    "Pandora canary history is retained but new canary collection is retired",
  );

  contains(
    collector,
    "[pandoraBookIndexAdapter.sourceCode, pandoraBookIndexAdapter]",
    "Pandora adapter is registered for the active production voter",
  );

  contains(
    lists,
    'code: "pandora-tr-new-releases",\n    sourceCode: "pandora",\n    title: "Pandora Kitabevi · Yeni Kitaplar · Türkçe",\n    categoryKey: "new-releases",\n    period: "live",\n    sourceUrl: "https://www.pandora.com.tr/Yeni_Kitaplar/Turkce",\n    maxRank: null,\n    includeInComposite: false,\n    collectionEveryMinutes: 360,\n    publiclyVisible: false,\n    enabled: false',
    "Pandora new-release collector remains disabled until native scope is selected",
  );
  contains(
    adapter,
    'const NEW_RELEASE_API_URL = "https://www.pandora.com.tr/api/yenikitaplar?dil=1";',
    "Pandora verified first-party new-release API",
  );
  contains(
    adapter,
    "BOOK_INDEX_PANDORA_NEW_RELEASE_LIMIT_NOT_CONFIGURED",
    "Pandora new-release collection fails closed without an explicit rank limit",
  );
  contains(
    collector,
    "maxRank: list.maxRank",
    "collector passes configured native rank limits to source adapters",
  );
});


test("Kitap Ambari private canary collects source history without composite voting", () => {
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(
    sources,
    'name: "Kitap Ambarı",\n    market: "TR",\n    countryCode: "TR",\n    baseUrl: "https://www.kitapambari.com",\n    includeInTurkeyIndex: true,\n    independenceGroup: "kitapambari",\n    operatorName: "Ötüken Neşriyat A.Ş.",\n    phase: "phase_2",\n    collectionState: "ready"',
    "Kitap Ambari adapter is ready for private canary collection",
  );

  contains(
    lists,
    'code: "kitapambari-tr-live",\n    sourceCode: "kitapambari",\n    title: "Kitap Ambarı · Çok Satanlar",\n    categoryKey: "general",\n    period: "live",\n    sourceUrl: "https://www.kitapambari.com/cok-satanlar-1",\n    maxRank: null,\n    includeInComposite: false,\n    collectionEveryMinutes: null,\n    publiclyVisible: false,\n    enabled: false',
    "Kitap Ambari voter stays disabled",
  );

  contains(
    lists,
    'code: "kitapambari-tr-live-canary",\n    sourceCode: "kitapambari",\n    title: "Kitap Ambarı · Çok Satanlar · Canary",\n    categoryKey: "general",\n    period: "live",\n    sourceUrl: "https://www.kitapambari.com/cok-satanlar-1",\n    maxRank: 100,\n    includeInComposite: false,\n    collectionEveryMinutes: 360,\n    publiclyVisible: false,\n    enabled: true',
    "Kitap Ambari canary is private and non-voting",
  );

  contains(
    collector,
    "[kitapAmbariBookIndexAdapter.sourceCode, kitapAmbariBookIndexAdapter]",
    "Kitap Ambari adapter is registered for the private canary",
  );
});
test("KitapStore qualified voter preserves fail-closed Top 100 collection", () => {
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const adapter = source("src/lib/book-index/sources/kitapstore.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(sources, 'code: "kitapstore"', "KitapStore research source");
  contains(
    sources,
    'name: "KitapStore",\n    market: "TR",\n    countryCode: "TR",\n    baseUrl: "https://www.kitapstore.com",\n    includeInTurkeyIndex: true,\n    independenceGroup: "vedat-akoglu-kitapstore",\n    operatorName: "Vedat Akoğlu - KitapStore",\n    phase: "phase_2",\n    collectionState: "ready"',
    "KitapStore source is ready for production collection",
  );
  contains(lists, 'code: "kitapstore-tr-live"', "KitapStore research list");
  contains(
    lists,
    'sourceUrl: "https://www.kitapstore.com/liste/2/cok-satanlar/!Sayfa=1",\n    maxRank: 100,\n    includeInComposite: true,\n    collectionEveryMinutes: 360,\n    publiclyVisible: true,\n    enabled: true',
    "KitapStore voter is active in the Turkey composite",
  );
  contains(lists, 'code: "kitapstore-tr-live-canary"', "KitapStore canary list");
  contains(
    lists,
    'title: "KitapStore · Çok Satanlar · Canary",\n    categoryKey: "general",\n    period: "live",\n    sourceUrl: "https://www.kitapstore.com/liste/2/cok-satanlar/!Sayfa=1",\n    maxRank: 100,\n    includeInComposite: false,\n    collectionEveryMinutes: null,\n    publiclyVisible: false,\n    enabled: false',
    "KitapStore canary history is retained but new canary collection is retired",
  );

  contains(adapter, 'const PAGE_COUNT = 4;', "four-page Top 100 bound");
  contains(adapter, 'const EXPECTED_PAGE_BOOKS = 25;', "25 source cards per page");
  contains(adapter, 'const MAX_BOOKS = PAGE_COUNT * EXPECTED_PAGE_BOOKS;', "Top 100 result cap");
  contains(adapter, "\\bIcBaslik\\b", "main bestseller heading scope");
  contains(adapter, "\\bIslemliL\\b", "main bestseller list scope");
  contains(adapter, "BOOK_INDEX_KITAPSTORE_BESTSELLER_HEADING_MISSING", "missing heading fail-closed gate");
  contains(adapter, "BOOK_INDEX_KITAPSTORE_BESTSELLER_LIST_MISSING", "missing list fail-closed gate");
  contains(adapter, "listBody.slice(start, end)", "cards are sliced from the scoped bestseller list");
  notContains(adapter, "html.slice(start, end)", "card offsets must not be applied to the full document");
  contains(adapter, 'itemtype=["\']http:\\/\\/schema\\.org\\/Book["\']', "schema.org Book card scope");
  contains(adapter, 'id=["\']Urun-([0-9]+)["\']', "stable product-id scope");
  contains(adapter, '\\bNo\\b', "native rank field");
  contains(adapter, '\\bUrunAdi\\b', "canonical title field");
  contains(adapter, 'classToken: "KisiAdi" | "FirmaAdi"', "bounded optional metadata classes");
  contains(adapter, 'anchorValueFromClass(card, "KisiAdi")', "optional author field scope");
  contains(adapter, 'anchorValueFromClass(card, "FirmaAdi")', "optional publisher field scope");
  contains(adapter, 'attributeValue(anchor[0], "title")', "full author/publisher value prefers anchor title");
  notContains(adapter, "BOOK_INDEX_KITAPSTORE_AUTHOR_MISSING", "missing author must not reject a valid ranked product");
  notContains(adapter, "BOOK_INDEX_KITAPSTORE_PUBLISHER_MISSING", "missing publisher must not reject a valid ranked product");
  contains(adapter, 'itemPropTag(card, "meta", "serialNumber")', "product-id cross-check");
  contains(adapter, 'itemPropTag(html, "span", "isbn")', "detail ISBN parser");
  contains(adapter, "BOOK_INDEX_KITAPSTORE_PAGE_SIZE_MISMATCH", "page-size fail-closed gate");
  contains(adapter, "BOOK_INDEX_KITAPSTORE_DUPLICATE_SOURCE_KEY", "duplicate source-key gate");
  contains(adapter, "BOOK_INDEX_KITAPSTORE_DUPLICATE_PRODUCT_URL", "duplicate URL gate");
  notContains(
    adapter,
    "BOOK_INDEX_KITAPSTORE_DUPLICATE_RANK",
    "native tied ranks must not be rejected",
  );
  notContains(
    adapter,
    "BOOK_INDEX_KITAPSTORE_RANK_MISMATCH",
    "native rank must not be forced to equal ordinal slot",
  );
  contains(
    adapter,
    "BOOK_INDEX_KITAPSTORE_RANK_SEQUENCE_MISMATCH",
    "native dense-rank sequence remains fail-closed",
  );
  contains(
    adapter,
    "book.rank < previousRank || book.rank > previousRank + 1",
    "native ties are accepted while decreases and gaps are rejected",
  );
  notContains(
    adapter,
    ".sort(\n    (left, right) => left.rank - right.rank,\n  )",
    "source/page order must not be hidden by rank sorting",
  );
  contains(adapter, 'context.listCode !== "kitapstore-tr-live"', "active voter list is an explicit adapter target");
  contains(adapter, 'context.listCode !== "kitapstore-tr-live-canary"', "historical canary remains an explicit adapter target");
  contains(adapter, 'const MAX_IDENTITY_ENRICHMENTS = 8;', "bounded missing-author enrichment cap");
  contains(adapter, 'const DETAIL_CONCURRENCY = 3;', "bounded detail concurrency");
  contains(adapter, '.filter(({ book }) => !book.authorName)', "only missing-author books are detail-enriched");
  contains(adapter, "BOOK_INDEX_KITAPSTORE_IDENTITY_ENRICHMENT_TOO_LARGE", "detail-enrichment volume fails closed");
  contains(adapter, "BOOK_INDEX_KITAPSTORE_IDENTITY_METADATA_MISSING", "missing detail ISBN fails closed");
  contains(adapter, "return enrichMissingAuthorIdentity(combined);", "bounded enrichment runs after native Top-100 validation");
  contains(
    adapter,
    'const VERIFIED_NON_BOOK_PRODUCT_IDS = new Set(["776749", "773082"]);',
    "only verified non-book product ids are excluded",
  );
  contains(
    adapter,
    "!VERIFIED_NON_BOOK_PRODUCT_IDS.has(book.sourceKey)",
    "non-book exclusion is exact source-key based",
  );
  notContains(
    adapter,
    "rank: index + 1",
    "KitapStore exclusions must not renumber native ranks",
  );
  contains(adapter, '"User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)"', "transparent user agent");
  contains(adapter, "AbortSignal.timeout(20_000)", "bounded request timeout");

  contains(
    collector,
    'import { kitapStoreBookIndexResearchAdapter } from "./sources/kitapstore";',
    "KitapStore canary adapter import",
  );
  contains(
    collector,
    "[kitapStoreBookIndexResearchAdapter.sourceCode, kitapStoreBookIndexResearchAdapter]",
    "KitapStore adapter registered for production collection",
  );
});
