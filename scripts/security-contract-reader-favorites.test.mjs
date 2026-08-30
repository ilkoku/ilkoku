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

test("reader favorites center separates works and authors", async () => {
  const favoritesPage = await read("src/app/favorilerim/page.tsx");
  assert.match(favoritesPage, /getReaderFavoriteAuthors/);
  assert.match(favoritesPage, />\s*Eserler\s*</);
  assert.match(favoritesPage, />\s*Yazarlar\s*</);
  assert.match(favoritesPage, /tip=yazar/);
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

test("reader author favorites use Prisma and the public author visibility boundary", async () => {
  const source = await read("src/features/reader/author-favorites.ts");

  assert.match(source, /prisma\.readerAuthorFavorite\.findUnique/);
  assert.match(source, /prisma\.readerAuthorFavorite\.create/);
  assert.match(source, /prisma\.readerAuthorFavorite\.delete/);
  assert.match(source, /language: "tr"/);
  assert.match(source, /BLOCKED_PUBLIC_WORK_SLUGS/);
  assert.match(source, /contentRating: \{ not: "adult_18"/);
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
