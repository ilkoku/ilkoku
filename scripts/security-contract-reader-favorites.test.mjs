import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("reader work favorites are actionable on current reader surfaces", async () => {
  const [table, workdesk, showcase] = await Promise.all([
    read("src/features/reader/components/ReaderWorksTable.tsx"),
    read("src/app/okuyucu/ReaderShelfTabs.tsx"),
    read("src/features/showcase/components/BookShowcase.tsx"),
  ]);

  assert.match(table, /toggleFavoriteAction/);
  assert.match(table, /Favoriye Ekle/);
  assert.match(table, /Favoriden Çıkar/);
  assert.match(workdesk, /toggleFavoriteAction/);
  assert.match(workdesk, /Favoriye Ekle/);
  assert.match(showcase, /toggleFavoriteAction/);
});

test("reader favorites center separates works and authors and links to author discovery", async () => {
  const favoritesPage = await read("src/app/favorilerim/page.tsx");
  assert.match(favoritesPage, /getReaderFavoriteAuthors/);
  assert.match(favoritesPage, />\s*Eserler\s*</);
  assert.match(favoritesPage, />\s*Yazarlar\s*</);
  assert.match(favoritesPage, /tip=yazar/);
  assert.match(favoritesPage, /href="\/yazar-kesfet"/);
});

test("reader author discovery is work-backed and uses the shared filter desk", async () => {
  const discovery = await read("src/app/yazar-kesfet/page.tsx");

  assert.match(discovery, /readerAuthorDiscoveryWorkWhere/);
  assert.match(discovery, /discoveryAuthorWhereFromWorkPool/);
  assert.match(discovery, /Yazar Keşfet/);
  assert.match(discovery, /ReaderFilterDesk/);
  assert.match(discovery, /Yazar, rumuz veya eser ara/);
  assert.match(discovery, /toggleReaderAuthorFavoriteAction/);
  assert.match(discovery, /Yazarı Favorile/);
  assert.match(discovery, /Yazar vitrini/);
  assert.match(discovery, /eşleşen eser/);
  assert.doesNotMatch(discovery, /name="tamamlanma"/);
  assert.doesNotMatch(discovery, /name="favori"/);
});

test("reader list pages share one filter, result, pagination and work-row standard", async () => {
  const [
    listStandard,
    standard,
    table,
    discover,
    favorites,
    continueReading,
    completed,
    authorDiscover,
  ] = await Promise.all([
    read("src/lib/discovery-list-standard.ts"),
    read("src/features/reader/discovery-standard.tsx"),
    read("src/features/reader/components/ReaderWorksTable.tsx"),
    read("src/app/kesfet/page.tsx"),
    read("src/app/favorilerim/page.tsx"),
    read("src/app/okumaya-devam/page.tsx"),
    read("src/app/tamamlanan-eserler/page.tsx"),
    read("src/app/yazar-kesfet/page.tsx"),
  ]);

  assert.match(listStandard, /DISCOVERY_PAGE_SIZE = 24/);
  assert.match(standard, /READER_LIST_PAGE_SIZE = DISCOVERY_PAGE_SIZE/);
  assert.match(standard, /function ReaderFilterDesk/);
  assert.match(standard, /function ReaderResultSummary/);
  assert.match(standard, /DiscoveryPagination as ReaderPagination/);
  assert.match(table, /workspace-table workspace-table--discovery/);
  assert.doesNotMatch(table, /compactDiscovery/);

  for (const source of [
    discover,
    favorites,
    continueReading,
    completed,
    authorDiscover,
  ]) {
    assert.match(source, /ReaderFilterDesk/);
    assert.match(source, /ReaderResultSummary/);
    assert.match(source, /ReaderPagination/);
  }

  for (const source of [discover, continueReading, completed]) {
    assert.match(source, /ReaderWorksTable/);
  }

  assert.doesNotMatch(discover, /reader-discovery-presets/);
  assert.doesNotMatch(discover, /name="dil"/);
  assert.doesNotMatch(discover, /name="okuma"/);
  assert.doesNotMatch(discover, /name="favori"/);
});

test("public author surfaces expose reader author favorite action", async () => {
  const [authors, author] = await Promise.all([
    read("src/app/yazarlar/page.tsx"),
    read("src/app/yazarlar/[publicId]/page.tsx"),
  ]);
  assert.match(authors, /toggleReaderAuthorFavoriteAction/);
  assert.match(authors, /Yazarı Favorile/);
  assert.match(author, /toggleReaderAuthorFavoriteAction/);
  assert.match(author, /Yazarı Favorile/);
});

test("reader author favorites share the safe author discovery work boundary", async () => {
  const [source, scope] = await Promise.all([
    read("src/features/reader/author-favorites.ts"),
    read("src/features/reader/author-discovery-scope.ts"),
  ]);

  assert.match(source, /readerAuthorDiscoveryWorkWhere/);
  assert.match(source, /discoveryAuthorWhereFromWorkPool/);
  assert.match(source, /prisma\.readerAuthorFavorite\.findUnique/);
  assert.match(source, /prisma\.readerAuthorFavorite\.create/);
  assert.match(source, /prisma\.readerAuthorFavorite\.delete/);
  assert.match(scope, /language: "tr"/);
  assert.match(scope, /BLOCKED_PUBLIC_WORK_SLUGS/);
  assert.match(scope, /contentRating: \{ not: "adult_18"/);
  assert.doesNotMatch(source, /\$executeRaw/);
});

test("favorite-author publication is adult-gated, clickable and idempotent", async () => {
  const source = await read("src/features/works/publication-notifications.ts");
  const adultGate = source.indexOf('work.contentRating === "adult_18"');
  const readerFavoriteDelivery = source.lastIndexOf(
    "createReaderFavoriteAuthorPublicationNotifications({",
  );

  assert.ok(adultGate >= 0, "adult publication gate must exist");
  assert.ok(
    readerFavoriteDelivery > adultGate,
    "reader author notification delivery must run only after the adult-content gate",
  );
  assert.match(source, /prisma\.readerAuthorFavorite\.findMany/);
  assert.match(source, /SELECT id\s+FROM Work[\s\S]*FOR UPDATE/);
  assert.match(source, /transaction\.notification\.findMany/);
  assert.match(source, /Favori yazarınız yeni eser yayımladı/);
  assert.match(source, /relatedEntityType: "work"/);
});

test("reader author favorite table is migration-backed, schema-modeled and recovery-verified", async () => {
  const [migration, manifest, schema] = await Promise.all([
    read(
      "prisma/migrations/20260830120500_reader_author_favorites/migration.sql",
    ),
    read("prisma/recovery/baseline-manifest.json"),
    read("prisma/schema.prisma"),
  ]);

  assert.match(migration, /CREATE TABLE `ReaderAuthorFavorite`/);
  assert.match(
    migration,
    /UNIQUE INDEX `ReaderAuthorFavorite_userId_authorId_key`/,
  );
  assert.match(schema, /model ReaderAuthorFavorite/);
  assert.match(schema, /@@unique\(\[userId, authorId\]\)/);
  assert.match(schema, /ReaderAuthorFavoriteReader/);
  assert.match(schema, /ReaderAuthorFavoriteAuthor/);
  assert.match(manifest, /"ReaderAuthorFavorite"/);
});
