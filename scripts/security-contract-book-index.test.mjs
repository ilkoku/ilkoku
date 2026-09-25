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
