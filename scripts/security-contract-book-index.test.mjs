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
