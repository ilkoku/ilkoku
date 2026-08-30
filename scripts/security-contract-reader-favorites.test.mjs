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

test("favorite-author publication creates reader notification without leaking adult works", async () => {
  const source = await read("src/features/works/publication-notifications.ts");
  const adultGate = source.indexOf('work.contentRating === "adult_18"');
  const readerFavoriteQuery = source.indexOf("ReaderAuthorFavorite");

  assert.ok(adultGate >= 0, "adult publication gate must exist");
  assert.ok(
    readerFavoriteQuery > adultGate,
    "reader author notification lookup must happen after the adult-content gate",
  );
  assert.match(source, /Favori yazarınız yeni eser yayımladı/);
  assert.match(source, /relatedEntityType: "work"/);
});

test("reader author favorite table is migration-backed and recovery-verified", async () => {
  const [migration, manifest] = await Promise.all([
    read(
      "prisma/migrations/20260830120500_reader_author_favorites/migration.sql",
    ),
    read("prisma/recovery/baseline-manifest.json"),
  ]);
  assert.match(migration, /CREATE TABLE `ReaderAuthorFavorite`/);
  assert.match(migration, /UNIQUE INDEX `ReaderAuthorFavorite_userId_authorId_key`/);
  assert.match(manifest, /"ReaderAuthorFavorite"/);
});
